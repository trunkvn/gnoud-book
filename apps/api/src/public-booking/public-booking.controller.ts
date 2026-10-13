import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
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
  @ApiCreatedResponse({
    description:
      'Đã đặt. Trả về id, status, startsAt, endsAt và manageToken (dùng cho /public/appointments/{token}). Email xác nhận được gửi qua job nền.',
  })
  @ApiBadRequestResponse({
    description:
      'Dữ liệu sai (email không hợp lệ, startsAt thiếu múi giờ, field lạ...)',
  })
  @ApiNotFoundResponse({ description: 'Không có cơ sở hoặc dịch vụ này' })
  @ApiConflictResponse({
    description:
      'Khung giờ không còn trống (có người vừa đặt) hoặc không hợp lệ với giờ làm việc',
  })
  @ApiTooManyRequestsResponse({
    description: 'Quá 10 lần đặt trong 1 phút từ cùng một IP',
  })
  @Post('appointments')
  @Throttle(BOOKING_LIMIT)
  book(@Param('slug') slug: string, @Body() dto: CreateAppointmentDto) {
    return this.booking.book(slug, dto);
  }
}
