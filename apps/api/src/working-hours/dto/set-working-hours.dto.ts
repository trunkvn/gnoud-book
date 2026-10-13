import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { END_TIME_PATTERN, START_TIME_PATTERN } from '../time.js';

export class WorkingIntervalDto {
  /** 0 = Chủ nhật, 1 = Thứ hai, … 6 = Thứ bảy */
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  /** Giờ mở cửa dạng HH:mm, ví dụ "09:00" */
  @Matches(START_TIME_PATTERN, {
    message: 'start phải có dạng HH:mm, ví dụ 09:00',
  })
  start: string;

  /** Giờ đóng cửa dạng HH:mm ("24:00" = hết ngày) */
  @Matches(END_TIME_PATTERN, { message: 'end phải có dạng HH:mm, ví dụ 17:30' })
  end: string;
}

export class SetWorkingHoursDto {
  /** Toàn bộ lịch tuần. Ngày nào không có khung giờ nào là ngày nghỉ. */
  @IsArray()
  @ArrayMaxSize(70)
  @ValidateNested({ each: true })
  @Type(() => WorkingIntervalDto)
  intervals: WorkingIntervalDto[];
}
