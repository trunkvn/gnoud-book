import { Matches } from 'class-validator';
import { DATE_PATTERN } from '../../common/patterns.js';

export class ListAppointmentsQueryDto {
  /** Ngày đầu (bao gồm), dạng YYYY-MM-DD, tính theo múi giờ của cơ sở */
  @Matches(DATE_PATTERN, { message: 'from phải có dạng YYYY-MM-DD' })
  from: string;

  /** Ngày cuối (bao gồm), dạng YYYY-MM-DD, tối đa 62 ngày sau from */
  @Matches(DATE_PATTERN, { message: 'to phải có dạng YYYY-MM-DD' })
  to: string;
}
