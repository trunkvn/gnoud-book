import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service.js';
import { SlotsQueryDto } from './dto/slots-query.dto.js';

// Các endpoint công khai cho KHÁCH – không cần đăng nhập.
@ApiTags('Public booking')
@Controller('public/businesses/:slug')
export class PublicBookingController {
  constructor(private readonly availability: AvailabilityService) {}

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
}
