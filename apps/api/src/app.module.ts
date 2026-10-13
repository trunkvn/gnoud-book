import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ServicesModule } from './services/services.module.js';
import { WorkingHoursModule } from './working-hours/working-hours.module.js';
import { PublicBookingModule } from './public-booking/public-booking.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BusinessesModule,
    ServicesModule,
    WorkingHoursModule,
    PublicBookingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
