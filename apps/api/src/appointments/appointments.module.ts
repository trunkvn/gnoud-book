import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';

@Module({
  imports: [AuthModule, BusinessesModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
