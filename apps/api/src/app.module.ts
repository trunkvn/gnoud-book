import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DEFAULT_LIMIT } from './config/rate-limits.js';
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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ...DEFAULT_LIMIT }],
        // Test e2e gửi hàng trăm request từ một IP nên tắt bằng biến môi trường
        skipIf: () => config.get('RATE_LIMIT_DISABLED') === 'true',
      }),
    }),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
