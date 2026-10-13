import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ServicesModule } from './services/services.module.js';
import { WorkingHoursModule } from './working-hours/working-hours.module.js';
import { PublicBookingModule } from './public-booking/public-booking.module.js';
import { MailModule } from './mail/mail.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BusinessesModule,
    ServicesModule,
    WorkingHoursModule,
    MailModule,
    JobsModule,
    NotificationsModule,
    PublicBookingModule,
    AppointmentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
