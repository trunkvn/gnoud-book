import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto.js';

// PartialType: giữ nguyên các field của CreateServiceDto nhưng biến tất cả thành tuỳ chọn.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  /** false = tạm ngừng bán (khách không thấy), vẫn giữ lịch sử lịch hẹn */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
