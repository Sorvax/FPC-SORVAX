import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run test files sequentially to prevent SQLite ID collisions
    // since all test files share the same database
    maxConcurrency: 1,
    fileParallelism: false,
  },
});
