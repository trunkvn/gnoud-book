import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AvailabilityService } from './availability.service.js';
import { BookingService } from './booking.service.js';
import { ManageAppointmentController } from './manage-appointment.controller.js';
import { ManageAppointmentService } from './manage-appointment.service.js';
import { PublicBookingController } from './public-booking.controller.js';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicBookingController, ManageAppointmentController],
  providers: [AvailabilityService, BookingService, ManageAppointmentService],
})
export class PublicBookingModule {}
