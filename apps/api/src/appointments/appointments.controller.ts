import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AppointmentsService } from './appointments.service.js';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto.js';

@ApiTags('Appointments (owner)')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @ApiOperation({
    summary: 'Lịch hẹn của cơ sở trong một khoảng ngày (mọi trạng thái)',
  })
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAppointmentsQueryDto,
  ) {
    return this.appointments.list(user.id, query);
  }

  @ApiOperation({ summary: 'Huỷ lịch hẹn (gửi email báo cho khách)' })
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointments.cancel(user.id, id);
  }

  @ApiOperation({ summary: 'Đánh dấu đã hoàn thành (chỉ sau giờ hẹn)' })
  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointments.complete(user.id, id);
  }
}
