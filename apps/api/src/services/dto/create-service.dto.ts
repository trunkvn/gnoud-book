import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @MaxLength(500)
  description?: string;

  /** Thời lượng (phút), từ 5 đến 480 */
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes: number;

  /** Giá theo đơn vị nhỏ nhất của tiền tệ (VND: 150000 = 150.000đ) */
  @IsInt()
  @Min(0)
  price: number;

  /** Mã tiền tệ ISO 4217, mặc định VND */
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency phải là mã 3 chữ in hoa, ví dụ VND',
  })
  currency?: string;
}
