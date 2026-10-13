import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsTimeZone, MaxLength } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @MaxLength(500)
  description?: string;

  // Múi giờ IANA, ví dụ "Asia/Ho_Chi_Minh". Giờ làm việc được hiểu theo múi giờ này.
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
