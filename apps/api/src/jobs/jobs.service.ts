import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss, type SendOptions } from 'pg-boss';
import { QUEUES, type QueueName, queueDefinitions } from './queues.js';

/**
 * Hàng đợi job chạy ngay trên PostgreSQL (thư viện pg-boss), nên không cần Redis.
 * Job được lưu bền trong database: server khởi động lại thì job vẫn còn, job lỗi được thử lại.
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly boss: PgBoss;
  private readonly retryDelaySeconds: number;
  private started?: Promise<void>;

  constructor(config: ConfigService) {
    this.boss = new PgBoss(config.getOrThrow<string>('DATABASE_URL'));
    this.boss.on('error', (error) => this.logger.error('pg-boss error', error));
    this.retryDelaySeconds = Number(
      config.get<string>('JOBS_RETRY_DELAY_SECONDS') ?? 30,
    );
  }

  onModuleInit() {
    return this.start();
  }

  async onModuleDestroy() {
    await this.start(); // tránh dừng khi chưa khởi động xong
    await this.boss.stop({ graceful: true, timeout: 10_000 });
  }

  /** Khởi động pg-boss (tự tạo bảng của nó trong schema "pgboss") và tạo các hàng đợi. */
  private start() {
    this.started ??= (async () => {
      await this.boss.start();
      const definitions = queueDefinitions(this.retryDelaySeconds);
      for (const name of Object.values(QUEUES)) {
        await this.boss.createQueue(name, definitions[name]);
        // createQueue không đụng vào hàng đợi đã tồn tại, nên đồng bộ lại cấu hình (trừ `policy`,
        // không đổi được) để việc chỉnh số lần thử lại, thời gian chờ... có hiệu lực ở lần chạy sau.
        const { policy: _policy, ...settings } = definitions[name];
        await this.boss.updateQueue(name, settings);
      }
    })();
    return this.started;
  }

  /** Xếp một job vào hàng đợi. Trả về null nếu bị bỏ qua vì đã có job cùng singletonKey. */
  async send<T extends object>(
    queue: QueueName,
    data: T,
    options?: SendOptions,
  ) {
    await this.start();
    return this.boss.send(queue, data, options);
  }

  /** Đăng ký hàm xử lý job. Hàm ném lỗi thì job được thử lại theo cấu hình hàng đợi. */
  async work<T extends object>(
    queue: QueueName,
    handler: (data: T) => Promise<void>,
  ) {
    await this.start();
    await this.boss.work<T>(queue, async (jobs) => {
      for (const job of jobs) {
        await handler(job.data);
      }
    });
  }

  /**
   * Chạy job theo lịch cron. Chỉ MỘT phiên bản của ứng dụng (dù chạy nhiều bản) xếp job mỗi lượt.
   * missed: 'once' = nếu server tắt qua nhiều lượt thì khi bật lại vẫn chạy bù một lần.
   */
  async schedule(queue: QueueName, cron: string) {
    await this.start();
    await this.boss.schedule(queue, cron, undefined, { missed: 'once' });
  }
}
