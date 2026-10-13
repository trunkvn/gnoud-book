import { BadRequestException, Injectable } from '@nestjs/common';
import { BusinessesService } from '../businesses/businesses.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SetWorkingHoursDto } from './dto/set-working-hours.dto.js';
import { findIntervalError, minutesToTime, timeToMinutes } from './time.js';

@Injectable()
export class WorkingHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businesses: BusinessesService,
  ) {}

  async get(userId: string) {
    const business = await this.businesses.requireForOwner(userId);
    const rows = await this.prisma.workingHours.findMany({
      where: { businessId: business.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });

    return {
      timezone: business.timezone,
      intervals: rows.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        start: minutesToTime(row.startMinute),
        end: minutesToTime(row.endMinute),
      })),
    };
  }

  // Thay thế toàn bộ lịch tuần bằng lịch mới. Cách này đơn giản cho giao diện:
  // người dùng sửa cả tuần rồi bấm Lưu một lần.
  async replace(userId: string, dto: SetWorkingHoursDto) {
    const business = await this.businesses.requireForOwner(userId);

    const rows = dto.intervals.map((interval) => ({
      dayOfWeek: interval.dayOfWeek,
      startMinute: timeToMinutes(interval.start),
      endMinute: timeToMinutes(interval.end),
    }));

    const error = findIntervalError(rows);
    if (error) {
      throw new BadRequestException(error);
    }

    // Trong một transaction: hoặc xoá cũ + tạo mới đều thành công, hoặc không đổi gì.
    await this.prisma.$transaction([
      this.prisma.workingHours.deleteMany({
        where: { businessId: business.id },
      }),
      this.prisma.workingHours.createMany({
        data: rows.map((row) => ({ ...row, businessId: business.id })),
      }),
    ]);

    return this.get(userId);
  }
}
