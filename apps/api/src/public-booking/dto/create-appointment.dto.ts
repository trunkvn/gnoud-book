import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsTimeZone,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAppointmentDto {
  @IsUUID()
  serviceId: string;

  /** Giờ bắt đầu lấy từ API slots, dạng ISO 8601 có múi giờ, ví dụ "2030-01-07T02:00:00.000Z" */
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'startsAt phải kèm múi giờ (Z hoặc +07:00)',
  })
  startsAt: string;

  @Transform(trim)
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  customerEmail: string;

  /** Múi giờ IANA của khách, dùng để hiển thị giờ trong email. Mặc định UTC */
  @IsOptional()
  @IsTimeZone()
  customerTimezone?: string;
}
