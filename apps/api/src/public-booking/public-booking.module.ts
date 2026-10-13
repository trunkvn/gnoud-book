import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { PublicBookingController } from './public-booking.controller.js';

@Module({
  controllers: [PublicBookingController],
  providers: [AvailabilityService],
})
export class PublicBookingModule {}
