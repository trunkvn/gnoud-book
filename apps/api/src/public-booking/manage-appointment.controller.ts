import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentSlotsQueryDto } from './dto/appointment-slots-query.dto.js';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto.js';
import { ManageAppointmentService } from './manage-appointment.service.js';
import { APPOINTMENT_NOT_FOUND } from './messages.js';

// Token sai định dạng cũng trả 404 như token không tồn tại, để không tiết lộ gì cho người dò.
const tokenPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(APPOINTMENT_NOT_FOUND),
});

// Khách quản lý lịch hẹn của mình bằng token trong email – không cần đăng nhập.
@ApiTags('Manage appointment')
@Controller('public/appointments/:token')
export class ManageAppointmentController {
  constructor(private readonly manage: ManageAppointmentService) {}

  @ApiOperation({ summary: 'Xem lịch hẹn (và còn huỷ/đổi được không)' })
  @Get()
  get(@Param('token', tokenPipe) token: string) {
    return this.manage.get(token);
  }

  @ApiOperation({
    summary: 'Các slot còn trống để đổi lịch, theo múi giờ người xem',
  })
  @Get('slots')
  slots(
    @Param('token', tokenPipe) token: string,
    @Query() query: AppointmentSlotsQueryDto,
  ) {
    return this.manage.slots(token, query);
  }

  @ApiOperation({ summary: 'Huỷ lịch hẹn (gọi lại khi đã huỷ vẫn trả 200)' })
  @Post('cancel')
  @HttpCode(200)
  cancel(@Param('token', tokenPipe) token: string) {
    return this.manage.cancel(token);
  }

  @ApiOperation({
    summary: 'Đổi sang giờ khác (409 nếu giờ đó không còn trống)',
  })
  @Post('reschedule')
  @HttpCode(200)
  reschedule(
    @Param('token', tokenPipe) token: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.manage.reschedule(token, dto);
  }
}
