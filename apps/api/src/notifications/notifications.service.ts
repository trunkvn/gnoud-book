import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service.js';
import { QUEUES } from '../jobs/queues.js';
import { renderAppointmentReminder } from '../mail/appointment-reminder.email.js';
import { renderAppointmentCancellation } from '../mail/appointment-cancellation.email.js';
import { renderBookingConfirmation } from '../mail/booking-confirmation.email.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { REMINDER_LEAD_HOURS, REMINDER_SWEEP_BATCH } from './reminder-rules.js';

/**
 * Logic gửi thông báo cho khách. Các hàm ở đây được job nền gọi, và được thiết kế để
 * chạy lại an toàn (idempotent): job bị thử lại hoặc chạy hai lần thì khách không bị làm phiền thêm.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jobs: JobsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Xếp job gửi email xác nhận (hoặc báo "đã đổi lịch"). Việc gửi chạy nền, nên nơi gọi
   * (đặt lịch, đổi lịch) trả lời khách ngay. Xếp job lỗi chỉ ghi log: không được làm hỏng
   * thay đổi đã lưu vào database.
   */
  queueBookingConfirmation(
    appointmentId: string,
    options: { rescheduled?: boolean } = {},
  ) {
    return this.enqueue(
      QUEUES.bookingConfirmation,
      appointmentId,
      options.rescheduled ? { rescheduled: true } : {},
    );
  }

  /** Xếp job gửi email báo đã huỷ lịch. */
  queueCancellation(appointmentId: string) {
    return this.enqueue(QUEUES.appointmentCancellation, appointmentId, {});
  }

  private async enqueue(
    queue: (typeof QUEUES)[keyof typeof QUEUES],
    appointmentId: string,
    extra: { rescheduled?: boolean },
  ) {
    try {
      await this.jobs.send(
        queue,
        { appointmentId, ...extra },
        { singletonKey: appointmentId },
      );
    } catch (error) {
      this.logger.error(
        `Không xếp được job ${queue} cho lịch ${appointmentId}`,
        error,
      );
    }
  }

  /**
   * Email xác nhận (hoặc báo "đã đổi lịch" khi `rescheduled`). Trả về false nếu bỏ qua
   * (lịch không còn tồn tại hoặc đã huỷ). Luôn đọc lại trạng thái mới nhất, nên nếu khách
   * đổi lịch trước khi job chạy thì email nói đúng giờ hiện tại.
   */
  async sendBookingConfirmation(
    appointmentId: string,
    options: { rescheduled?: boolean } = {},
  ): Promise<boolean> {
    const appointment = await this.findWithDetails(appointmentId);
    if (!appointment || appointment.status !== 'CONFIRMED') return false;

    await this.mail.send({
      to: appointment.customerEmail,
      ...renderBookingConfirmation(this.toEmailData(appointment), options),
    });
    return true;
  }

  /** Email báo đã huỷ. Ngược với các email khác: chỉ gửi khi lịch ĐÃ bị huỷ. */
  async sendCancellation(appointmentId: string): Promise<boolean> {
    const appointment = await this.findWithDetails(appointmentId);
    if (!appointment || appointment.status !== 'CANCELLED') return false;

    await this.mail.send({
      to: appointment.customerEmail,
      ...renderAppointmentCancellation(this.toEmailData(appointment)),
    });
    return true;
  }

  /**
   * Email nhắc lịch. Chỉ gửi khi lịch còn hiệu lực, chưa được nhắc, và chưa diễn ra.
   * Gửi xong mới đánh dấu `reminderSentAt`: nếu gửi lỗi thì job được thử lại, còn nếu
   * server chết ngay giữa hai bước thì tệ nhất là khách nhận hai email (chấp nhận được,
   * còn hơn là không nhận được email nào).
   */
  async sendReminder(
    appointmentId: string,
    now = new Date(),
  ): Promise<boolean> {
    const appointment = await this.findWithDetails(appointmentId);
    if (
      !appointment ||
      appointment.status !== 'CONFIRMED' ||
      appointment.reminderSentAt ||
      appointment.startsAt <= now
    ) {
      return false;
    }

    await this.mail.send({
      to: appointment.customerEmail,
      ...renderAppointmentReminder(this.toEmailData(appointment)),
    });
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { reminderSentAt: now },
    });
    return true;
  }

  /**
   * Quét các lịch hẹn sắp diễn ra trong vòng 24 giờ mà chưa nhắc, rồi xếp mỗi lịch một job.
   * Cách "quét định kỳ" này tự chịu được việc khách huỷ/đổi lịch hoặc server tắt một lúc:
   * mỗi lượt quét đều xem lại trạng thái hiện tại trong database.
   *
   * Lịch đặt khi còn chưa tới 24 giờ nữa thì không nhắc (khách vừa nhận email xác nhận).
   * Trả về số job đã xếp.
   */
  async enqueueDueReminders(now = new Date()): Promise<number> {
    const horizon = new Date(now.getTime() + REMINDER_LEAD_HOURS * 3_600_000);
    const lead = `${REMINDER_LEAD_HOURS} hours`;

    const due = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Appointment"
      WHERE status = 'CONFIRMED'
        AND "reminderSentAt" IS NULL
        AND "startsAt" > ${now}
        AND "startsAt" <= ${horizon}
        AND "startsAt" - "createdAt" > ${lead}::interval
      ORDER BY "startsAt"
      LIMIT ${REMINDER_SWEEP_BATCH}`;

    let queued = 0;
    for (const { id } of due) {
      // singletonKey: cùng một lịch hẹn không bao giờ có hai job nhắc cùng chờ/chạy một lúc
      const jobId = await this.jobs.send(
        QUEUES.appointmentReminder,
        { appointmentId: id },
        { singletonKey: id },
      );
      if (jobId) queued++;
    }
    return queued;
  }

  private findWithDetails(appointmentId: string) {
    return this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, business: true },
    });
  }

  private toEmailData(
    appointment: NonNullable<
      Awaited<ReturnType<NotificationsService['findWithDetails']>>
    >,
  ) {
    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    return {
      customerName: appointment.customerName,
      customerTimezone: appointment.customerTimezone,
      businessName: appointment.business.name,
      businessTimezone: appointment.business.timezone,
      serviceName: appointment.service.name,
      durationMinutes: appointment.service.durationMinutes,
      startsAt: appointment.startsAt,
      manageUrl: `${webUrl}/manage/${appointment.manageToken}`,
    };
  }
}
