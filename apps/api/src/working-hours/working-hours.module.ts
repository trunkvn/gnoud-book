import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { WorkingHoursController } from './working-hours.controller.js';
import { WorkingHoursService } from './working-hours.service.js';

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService],
})
export class WorkingHoursModule {}
