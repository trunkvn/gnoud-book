import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsWorker } from './notifications.worker.js';

@Module({
  providers: [NotificationsService, NotificationsWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}
