import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service.js';
import { QUEUES } from '../jobs/queues.js';
import { NotificationsService } from './notifications.service.js';
import { DEFAULT_REMINDER_SWEEP_CRON } from './reminder-rules.js';

type AppointmentJob = { appointmentId: string };

/** Nối các hàm trong NotificationsService vào hàng đợi: ai xử lý job nào, và lịch quét định kỳ. */
@Injectable()
export class NotificationsWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.jobs.work<AppointmentJob>(
      QUEUES.bookingConfirmation,
      async ({ appointmentId }) => {
        await this.notifications.sendBookingConfirmation(appointmentId);
      },
    );

    await this.jobs.work<AppointmentJob>(
      QUEUES.appointmentReminder,
      async ({ appointmentId }) => {
        await this.notifications.sendReminder(appointmentId);
      },
    );

    // Job quét: định kỳ tìm lịch sắp tới và xếp job nhắc cho từng lịch
    await this.jobs.work<Record<string, never>>(
      QUEUES.reminderSweep,
      async () => {
        await this.notifications.enqueueDueReminders();
      },
    );
    await this.jobs.schedule(
      QUEUES.reminderSweep,
      this.config.get<string>('REMINDER_SWEEP_CRON') ??
        DEFAULT_REMINDER_SWEEP_CRON,
    );
  }
}
