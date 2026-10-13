import { OmitType } from '@nestjs/swagger';
import { SlotsQueryDto } from './slots-query.dto.js';

// Giống tra cứu slot thường, nhưng dịch vụ đã biết từ lịch hẹn nên không cần serviceId.
export class AppointmentSlotsQueryDto extends OmitType(SlotsQueryDto, [
  'serviceId',
] as const) {}
