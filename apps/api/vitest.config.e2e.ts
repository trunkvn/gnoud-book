import { defineConfig } from 'vitest/config';
import { DATABASE_URL_TEST } from './test/test-env.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // e2e chạy trên database riêng, không đụng vào dữ liệu dev
    env: {
      DATABASE_URL: DATABASE_URL_TEST,
      JWT_SECRET: 'e2e-secret',
      RATE_LIMIT_DISABLED: 'true', // test chạy hàng trăm request từ một IP; rate-limit có test riêng
      JOBS_RETRY_DELAY_SECONDS: '1', // job lỗi được thử lại sau ~1 giây thay vì 30 giây
    },
    fileParallelism: false,
    // Test e2e chạm database thật nên nhiều khi chậm hơn 5 giây mặc định khi máy đang bận.
    testTimeout: 20_000,
  },
});
