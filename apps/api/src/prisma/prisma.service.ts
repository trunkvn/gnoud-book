import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        // BẮT BUỘC dùng UTC cho phiên kết nối. Nếu Postgres chạy ở múi giờ khác (máy dev ở VN thì
        // là +07), adapter ghi/đọc cột timestamptz lệch đúng chừng đó giờ mà không báo lỗi gì.
        // Mọi thứ chỉ đi qua Prisma vẫn "nhất quán" nên rất khó phát hiện; xem test/timezone.e2e-spec.ts.
        options: '-c timezone=UTC',
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
