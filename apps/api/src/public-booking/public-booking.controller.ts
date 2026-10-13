import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BOOKING_LIMIT } from '../config/rate-limits.js';
import { AvailabilityService } from './availability.service.js';
import { BookingService } from './booking.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { SlotsQueryDto } from './dto/slots-query.dto.js';

// Các endpoint công khai cho KHÁCH – không cần đăng nhập.
@ApiTags('Public booking')
@Controller('public/businesses/:slug')
export class PublicBookingController {
  constructor(
    private readonly availability: AvailabilityService,
    private readonly booking: BookingService,
  ) {}

  @ApiOperation({ summary: 'Thông tin cơ sở và các dịch vụ đang bán' })
  @Get()
  getBusiness(@Param('slug') slug: string) {
    return this.availability.getPublicBusiness(slug);
  }

  @ApiOperation({
    summary: 'Các slot còn trống của một dịch vụ, theo múi giờ người xem',
  })
  @Get('slots')
  getSlots(@Param('slug') slug: string, @Query() query: SlotsQueryDto) {
    return this.availability.getSlots(slug, query);
  }

  @ApiOperation({
    summary:
      'Đặt lịch (409 nếu khung giờ không còn trống), gửi email xác nhận cho khách',
  })
  @Post('appointments')
  @Throttle(BOOKING_LIMIT)
  book(@Param('slug') slug: string, @Body() dto: CreateAppointmentDto) {
    return this.booking.book(slug, dto);
  }
}
