import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isNoOverlapViolation } from '../common/db-errors.js';
import { renderBookingConfirmation } from '../mail/booking-confirmation.email.js';
import { MailService } from '../mail/mail.service.js';
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
    private readonly mail: MailService,
    private readonly config: ConfigService,
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

    await this.sendConfirmationEmail(appointment, business, service);

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

  // Lịch hẹn đã lưu xong rồi: gửi email lỗi thì chỉ ghi log, không làm hỏng việc đặt lịch.
  // (Step 7 sẽ chuyển việc gửi email sang job nền có thử lại.)
  private async sendConfirmationEmail(
    appointment: {
      customerName: string;
      customerEmail: string;
      customerTimezone: string;
      startsAt: Date;
      manageToken: string;
    },
    business: { name: string; timezone: string },
    service: { name: string; durationMinutes: number },
  ) {
    try {
      const webUrl =
        this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
      const email = renderBookingConfirmation({
        customerName: appointment.customerName,
        customerTimezone: appointment.customerTimezone,
        businessName: business.name,
        businessTimezone: business.timezone,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        startsAt: appointment.startsAt,
        manageUrl: `${webUrl}/manage/${appointment.manageToken}`,
      });
      await this.mail.send({ to: appointment.customerEmail, ...email });
    } catch (error) {
      this.logger.error(
        `Không gửi được email xác nhận cho ${appointment.customerEmail}`,
        error,
      );
    }
  }
}
