import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { BusinessesService } from '../businesses/businesses.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto.js';

/** Một lần xem tối đa bao nhiêu ngày (đủ cho một tháng và phần tuần dư hai đầu) */
const MAX_RANGE_DAYS = 62;

/** Chủ cơ sở xem và quản lý lịch hẹn của cơ sở mình. */
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businesses: BusinessesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Lịch hẹn có giờ bắt đầu trong [from, to], tính theo ngày của cơ sở, mọi trạng thái. */
  async list(userId: string, query: ListAppointmentsQueryDto) {
    const business = await this.businesses.requireForOwner(userId);

    const zone = business.timezone;
    const first = DateTime.fromISO(query.from, { zone });
    const last = DateTime.fromISO(query.to, { zone });
    if (!first.isValid || !last.isValid) {
      throw new BadRequestException('Ngày không hợp lệ');
    }
    const dayCount = Math.round(last.diff(first, 'days').days) + 1;
    if (dayCount < 1) {
      throw new BadRequestException('to phải cùng hoặc sau from');
    }
    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Chỉ xem được tối đa ${MAX_RANGE_DAYS} ngày một lần`,
      );
    }

    const rows = await this.prisma.appointment.findMany({
      where: {
        businessId: business.id,
        startsAt: {
          gte: first.startOf('day').toJSDate(),
          lt: last.plus({ days: 1 }).startOf('day').toJSDate(),
        },
      },
      include: { service: true },
      orderBy: { startsAt: 'asc' },
    });

    return { timezone: zone, appointments: rows.map(toView) };
  }

  /** Chủ cơ sở huỷ lịch: không bị giới hạn hạn chót như khách. Gọi lại thì không sao. */
  async cancel(userId: string, id: string, now = new Date()) {
    const appointment = await this.findOwned(userId, id);
    if (appointment.status === 'CANCELLED') return toView(appointment);
    if (appointment.status === 'COMPLETED') {
      throw new ConflictException('Lịch hẹn đã hoàn thành, không thể huỷ');
    }

    // Điều kiện status trong WHERE: hai lần bấm cùng lúc chỉ gửi một email huỷ
    const { count } = await this.prisma.appointment.updateMany({
      where: { id: appointment.id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    if (count === 1) await this.notifications.queueCancellation(appointment.id);

    return toView(await this.findOwned(userId, id));
  }

  /** Đánh dấu đã hoàn thành. Chỉ làm được sau khi lịch hẹn đã bắt đầu. */
  async complete(userId: string, id: string, now = new Date()) {
    const appointment = await this.findOwned(userId, id);
    if (appointment.status === 'COMPLETED') return toView(appointment);
    if (appointment.status === 'CANCELLED') {
      throw new ConflictException('Lịch hẹn đã huỷ');
    }
    if (appointment.startsAt > now) {
      throw new ConflictException('Lịch hẹn chưa bắt đầu');
    }

    await this.prisma.appointment.updateMany({
      where: { id: appointment.id, status: 'CONFIRMED' },
      data: { status: 'COMPLETED' },
    });
    return toView(await this.findOwned(userId, id));
  }

  // Chỉ tìm trong cơ sở của chính người dùng; lịch của người khác cũng trả 404.
  private async findOwned(userId: string, id: string) {
    const business = await this.businesses.requireForOwner(userId);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, businessId: business.id },
      include: { service: true },
    });
    if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');
    return appointment;
  }
}

type AppointmentWithService = NonNullable<
  Awaited<ReturnType<PrismaService['appointment']['findFirst']>>
> & { service: { id: string; name: string; durationMinutes: number } };

// Không trả manageToken: đó là "chìa khoá" của khách, chủ cơ sở không cần và không nên có.
function toView(appointment: AppointmentWithService) {
  return {
    id: appointment.id,
    status: appointment.status,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
    customer: {
      name: appointment.customerName,
      email: appointment.customerEmail,
      timezone: appointment.customerTimezone,
    },
    service: {
      id: appointment.service.id,
      name: appointment.service.name,
      durationMinutes: appointment.service.durationMinutes,
    },
  };
}
