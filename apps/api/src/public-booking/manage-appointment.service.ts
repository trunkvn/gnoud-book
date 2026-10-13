import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isSlotContention } from '../common/db-errors.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { needsReminder } from '../notifications/reminder-rules.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AvailabilityService } from './availability.service.js';
import { canChange, changeDeadline } from './change-policy.js';
import type { AppointmentSlotsQueryDto } from './dto/appointment-slots-query.dto.js';
import type { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto.js';
import {
  APPOINTMENT_NOT_FOUND,
  CANNOT_CHANGE,
  CHANGED_MEANWHILE,
  SLOT_TAKEN,
} from './messages.js';

/**
 * Khách xem, huỷ hoặc đổi lịch hẹn của mình mà không cần tài khoản: "chìa khoá" là
 * manageToken trong link gửi qua email. Token không đoán được nên ai giữ link thì quản lý được.
 */
@Injectable()
export class ManageAppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  async get(token: string, now = new Date()) {
    return this.toView(await this.findByToken(token), now);
  }

  /** Slot còn trống để đổi sang. Lịch hiện tại không tự chặn các giờ sát nó. */
  async slots(
    token: string,
    query: AppointmentSlotsQueryDto,
    now = new Date(),
  ) {
    const appointment = await this.findByToken(token);
    if (!canChange(appointment, now))
      throw new ConflictException(CANNOT_CHANGE);

    return this.availability.slotsFor(
      appointment.business,
      appointment.service,
      query,
      now,
      appointment.id,
    );
  }

  /** Huỷ lịch. Gọi lại khi đã huỷ thì không sao (idempotent): vẫn trả về trạng thái hiện tại. */
  async cancel(token: string, now = new Date()) {
    const appointment = await this.findByToken(token);
    if (appointment.status === 'CANCELLED')
      return this.toView(appointment, now);
    if (!canChange(appointment, now))
      throw new ConflictException(CANNOT_CHANGE);

    // Điều kiện status trong WHERE: nếu hai yêu cầu huỷ cùng lúc thì chỉ một cái "thắng"
    // và chỉ một email huỷ được gửi.
    const { count } = await this.prisma.appointment.updateMany({
      where: { id: appointment.id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    if (count === 1) await this.notifications.queueCancellation(appointment.id);

    return this.toView(await this.findByToken(token), now);
  }

  async reschedule(
    token: string,
    dto: RescheduleAppointmentDto,
    now = new Date(),
  ) {
    const appointment = await this.findByToken(token);
    if (!canChange(appointment, now))
      throw new ConflictException(CANNOT_CHANGE);

    // Không tin client: tính lại slot, bỏ qua chính lịch hẹn này khi xét "đã có người đặt".
    const requested = new Date(dto.startsAt);
    const openSlots = await this.availability.findOpenSlots(
      appointment.business,
      appointment.service,
      requested,
      new Date(requested.getTime() + 1),
      now,
      appointment.id,
    );
    const slot = openSlots.find(
      (s) => s.startsAt.getTime() === requested.getTime(),
    );
    if (!slot) throw new ConflictException(SLOT_TAKEN);

    try {
      // WHERE gồm giờ cũ: nếu lịch vừa bị đổi/huỷ ở nơi khác thì không ghi đè. Ràng buộc chống
      // chồng giờ của database vẫn canh cửa cả với UPDATE, nên không thể "đổi vào" giờ vừa bị ai đó đặt.
      const { count } = await this.prisma.appointment.updateMany({
        where: {
          id: appointment.id,
          status: 'CONFIRMED',
          startsAt: appointment.startsAt,
        },
        data: {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          // Giờ mới còn xa (> 24h): chờ được nhắc theo giờ mới. Sát giờ: coi như đã xử lý,
          // vì khách vừa nhận email "đã đổi lịch".
          reminderSentAt: needsReminder(slot.startsAt, now) ? null : now,
        },
      });
      if (count === 0) throw new ConflictException(CHANGED_MEANWHILE);
    } catch (error) {
      if (isSlotContention(error)) throw new ConflictException(SLOT_TAKEN);
      throw error;
    }

    await this.notifications.queueBookingConfirmation(appointment.id, {
      rescheduled: true,
    });
    return this.toView(await this.findByToken(token), now);
  }

  private async findByToken(token: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { manageToken: token },
      include: { service: true, business: true },
    });
    if (!appointment) throw new NotFoundException(APPOINTMENT_NOT_FOUND);
    return appointment;
  }

  // Chỉ trả những gì trang quản lý cần: không có email, không có id nội bộ.
  private toView(
    appointment: NonNullable<
      Awaited<ReturnType<ManageAppointmentService['findByToken']>>
    >,
    now: Date,
  ) {
    return {
      status: appointment.status,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      canChange: canChange(appointment, now),
      changeDeadline: changeDeadline(appointment.startsAt).toISOString(),
      customer: {
        name: appointment.customerName,
        timezone: appointment.customerTimezone,
      },
      service: {
        id: appointment.service.id,
        name: appointment.service.name,
        durationMinutes: appointment.service.durationMinutes,
        price: appointment.service.price,
        currency: appointment.service.currency,
      },
      business: {
        name: appointment.business.name,
        slug: appointment.business.slug,
        timezone: appointment.business.timezone,
      },
    };
  }
}
