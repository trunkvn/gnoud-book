import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Id của dịch vụ (lấy từ GET /public/businesses/{slug})',
    example: '019a4f0e-6c1d-7b3a-9d52-3e8f1a2b4c5d',
  })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    description:
      'Giờ bắt đầu, lấy nguyên từ trường startsAt của API slots (ISO 8601, có múi giờ)',
    example: '2030-01-07T02:00:00.000Z',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'startsAt phải kèm múi giờ (Z hoặc +07:00)',
  })
  startsAt: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  @Transform(trim)
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string;

  @ApiProperty({
    description: 'Email nhận xác nhận, nhắc lịch và link huỷ/đổi lịch',
    example: 'an.nguyen@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  customerEmail: string;

  @ApiPropertyOptional({
    description:
      'Múi giờ IANA của khách, dùng để hiển thị giờ trong email. Mặc định UTC',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsTimeZone()
  customerTimezone?: string;
}
