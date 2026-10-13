import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { isNoOverlapViolation } from '../common/db-errors.js';
import { JobsService } from '../jobs/jobs.service.js';
import { QUEUES } from '../jobs/queues.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AvailabilityService } from './availability.service.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';

const SLOT_TAKEN = 'Khung giờ này không còn trống, vui lòng chọn giờ khác';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly jobs: JobsService,
  ) {}

  async book(slug: string, dto: CreateAppointmentDto, now = new Date()) {
    const { business, service } = await this.availability.requireBookable(
      slug,
      dto.serviceId,
    );

    // Không tin client: tính lại xem giờ này có thực sự còn trống không
    // (đúng giờ làm việc, đúng lưới 30 phút, chưa qua, chưa ai đặt).
    const requested = new Date(dto.startsAt);
    const openSlots = await this.availability.findOpenSlots(
      business,
      service,
      requested,
      new Date(requested.getTime() + 1),
      now,
    );
    const slot = openSlots.find(
      (s) => s.startsAt.getTime() === requested.getTime(),
    );
    if (!slot) {
      throw new ConflictException(SLOT_TAKEN);
    }

    // Kiểm tra ở trên chưa đủ: hai khách có thể cùng vượt qua nó trong cùng một tích tắc.
    // Người thắng là người ghi được vào DB; ràng buộc "Appointment_no_overlap" từ chối người còn lại.
    let appointment;
    try {
      appointment = await this.prisma.appointment.create({
        data: {
          businessId: business.id,
          serviceId: service.id,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerTimezone: dto.customerTimezone ?? 'UTC',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
        },
      });
    } catch (error) {
      if (isNoOverlapViolation(error)) {
        throw new ConflictException(SLOT_TAKEN);
      }
      throw error;
    }

    await this.queueConfirmationEmail(appointment.id);

    return {
      id: appointment.id,
      status: appointment.status,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      manageToken: appointment.manageToken,
      customer: {
        name: appointment.customerName,
        email: appointment.customerEmail,
        timezone: appointment.customerTimezone,
      },
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        currency: service.currency,
      },
      business: {
        name: business.name,
        slug: business.slug,
        timezone: business.timezone,
      },
    };
  }

  // Lịch hẹn đã lưu xong rồi: việc gửi email giao cho job nền (có thử lại nếu lỗi),
  // nên khách nhận phản hồi ngay và email hỏng không làm hỏng việc đặt lịch.
  private async queueConfirmationEmail(appointmentId: string) {
    try {
      await this.jobs.send(
        QUEUES.bookingConfirmation,
        { appointmentId },
        { singletonKey: appointmentId },
      );
    } catch (error) {
      this.logger.error(
        `Không xếp được job email xác nhận cho lịch ${appointmentId}`,
        error,
      );
    }
  }
}
