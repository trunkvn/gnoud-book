import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { SetWorkingHoursDto } from './dto/set-working-hours.dto.js';
import { WorkingHoursService } from './working-hours.service.js';

@ApiTags('Working hours')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly workingHours: WorkingHoursService) {}

  @ApiOperation({ summary: 'Xem giờ làm việc theo tuần' })
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.workingHours.get(user.id);
  }

  @ApiOperation({ summary: 'Đặt lại toàn bộ giờ làm việc theo tuần' })
  @Put()
  replace(@CurrentUser() user: AuthUser, @Body() dto: SetWorkingHoursDto) {
    return this.workingHours.replace(user.id, dto);
  }
}
