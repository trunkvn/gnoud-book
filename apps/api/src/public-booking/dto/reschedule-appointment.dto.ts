import { PickType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto.js';

// Đổi lịch chỉ cần giờ mới; luật kiểm tra giống hệt lúc đặt lịch nên lấy lại từ DTO đặt lịch.
export class RescheduleAppointmentDto extends PickType(CreateAppointmentDto, [
  'startsAt',
] as const) {}
