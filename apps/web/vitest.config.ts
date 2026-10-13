import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Chỉ test các hàm thuần trong lib/ (không cần trình duyệt)
    include: ['lib/**/*.test.ts'],
  },
});
