import { IsOptional, IsTimeZone, IsUUID, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class SlotsQueryDto {
  /** Dịch vụ khách muốn đặt (cần để biết thời lượng) */
  @IsUUID()
  serviceId: string;

  /** Ngày bắt đầu, dạng YYYY-MM-DD, tính theo múi giờ của người xem. Mặc định: hôm nay */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'from phải có dạng YYYY-MM-DD' })
  from?: string;

  /** Ngày kết thúc (bao gồm), dạng YYYY-MM-DD. Mặc định: from + 6 ngày */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'to phải có dạng YYYY-MM-DD' })
  to?: string;

  /** Múi giờ IANA của người xem, ví dụ "Asia/Tokyo". Mặc định: múi giờ của cơ sở */
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
