import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { BookingService } from './booking.service.js';
import { PublicBookingController } from './public-booking.controller.js';

@Module({
  controllers: [PublicBookingController],
  providers: [AvailabilityService, BookingService],
})
export class PublicBookingModule {}
