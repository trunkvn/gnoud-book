import { execSync } from 'node:child_process';
import { DATABASE_URL_TEST } from './test-env.js';

// Chạy một lần trước toàn bộ e2e test: đảm bảo database test có đủ bảng mới nhất.
export default function setup() {
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: DATABASE_URL_TEST },
  });
}
