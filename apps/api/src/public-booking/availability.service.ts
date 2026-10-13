import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import type { Business, Service } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_RANGE_DAYS, MIN_NOTICE_MINUTES } from './booking-rules.js';
import type { SlotsQueryDto } from './dto/slots-query.dto.js';
import { generateSlots } from './slots.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Thông tin công khai của cơ sở + các dịch vụ đang bán (để dựng trang đặt lịch) */
  async getPublicBusiness(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        description: true,
        timezone: true,
        services: {
          where: { active: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            price: true,
            currency: true,
          },
        },
      },
    });
    if (!business) {
      throw new NotFoundException('Không tìm thấy cơ sở');
    }
    return business;
  }

  /** Tìm cơ sở theo slug và dịch vụ đang bán thuộc ĐÚNG cơ sở đó. Dùng cho cả tra cứu và đặt lịch. */
  async requireBookable(slug: string, serviceId: string) {
    const business = await this.prisma.business.findUnique({ where: { slug } });
    if (!business) {
      throw new NotFoundException('Không tìm thấy cơ sở');
    }
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id, active: true },
    });
    if (!service) {
      throw new NotFoundException('Không tìm thấy dịch vụ');
    }
    return { business, service };
  }

  /** Các slot còn trống có giờ bắt đầu trong [rangeStart, rangeEnd). */
  async findOpenSlots(
    business: Business,
    service: Service,
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
    /** Lịch hẹn đang được đổi giờ: không để nó tự chặn chính mình */
    ignoreAppointmentId?: string,
  ) {
    const [workingHours, busy] = await Promise.all([
      this.prisma.workingHours.findMany({ where: { businessId: business.id } }),
      // Lịch hẹn bắt đầu SAU rangeEnd vẫn có thể đè lên slot cuối khoảng (slot dài `duration` phút),
      // nên phải lấy thêm `duration` phút phía sau. Lịch đã huỷ không chiếm chỗ.
      this.prisma.appointment.findMany({
        where: {
          businessId: business.id,
          status: 'CONFIRMED',
          ...(ignoreAppointmentId && { id: { not: ignoreAppointmentId } }),
          startsAt: {
            lt: new Date(rangeEnd.getTime() + service.durationMinutes * 60_000),
          },
          endsAt: { gt: rangeStart },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    return generateSlots({
      timezone: business.timezone,
      intervals: workingHours,
      durationMinutes: service.durationMinutes,
      rangeStart,
      rangeEnd,
      busy,
      earliestStart: new Date(now.getTime() + MIN_NOTICE_MINUTES * 60_000),
    });
  }

  async getSlots(slug: string, query: SlotsQueryDto, now = new Date()) {
    const { business, service } = await this.requireBookable(
      slug,
      query.serviceId,
    );
    return this.slotsFor(business, service, query, now);
  }

  /**
   * Slot trống của một dịch vụ, gom theo ngày của người xem. Dùng cho cả trang đặt lịch lẫn
   * trang đổi lịch (khi đó truyền `ignoreAppointmentId` để lịch cũ không chặn giờ liền kề của nó).
   */
  async slotsFor(
    business: Business,
    service: Service,
    query: { from?: string; to?: string; timezone?: string },
    now = new Date(),
    ignoreAppointmentId?: string,
  ) {
    // Ngày from/to được hiểu theo múi giờ của NGƯỜI XEM
    const viewerTimezone = query.timezone ?? business.timezone;
    const firstDay = query.from
      ? DateTime.fromISO(query.from, { zone: viewerTimezone })
      : DateTime.fromJSDate(now, { zone: viewerTimezone }).startOf('day');
    const lastDay = query.to
      ? DateTime.fromISO(query.to, { zone: viewerTimezone })
      : firstDay.plus({ days: 6 });

    if (!firstDay.isValid || !lastDay.isValid) {
      throw new BadRequestException('Ngày không hợp lệ');
    }
    const dayCount = Math.round(lastDay.diff(firstDay, 'days').days) + 1;
    if (dayCount < 1) {
      throw new BadRequestException('to phải cùng hoặc sau from');
    }
    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Chỉ xem được tối đa ${MAX_RANGE_DAYS} ngày một lần`,
      );
    }

    const rangeStart = firstDay.startOf('day').toJSDate();
    const rangeEnd = lastDay.plus({ days: 1 }).startOf('day').toJSDate();
    const slots = await this.findOpenSlots(
      business,
      service,
      rangeStart,
      rangeEnd,
      now,
      ignoreAppointmentId,
    );

    // Gom theo NGÀY CỦA NGƯỜI XEM (một slot 22:00 giờ VN có thể là ngày hôm sau ở Tokyo)
    const days = Array.from({ length: dayCount }, (_, index) => ({
      date: firstDay.plus({ days: index }).toISODate()!,
      slots: [] as { startsAt: string; endsAt: string; time: string }[],
    }));
    const byDate = new Map(days.map((day) => [day.date, day]));

    for (const slot of slots) {
      const local = DateTime.fromJSDate(slot.startsAt, {
        zone: viewerTimezone,
      });
      byDate.get(local.toISODate()!)?.slots.push({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        time: local.toFormat('HH:mm'),
      });
    }

    return {
      business: {
        name: business.name,
        slug: business.slug,
        timezone: business.timezone,
      },
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        currency: service.currency,
      },
      viewerTimezone,
      days,
    };
  }
}
