import { defineConfig } from 'vitest/config';
import path from 'node:path';
const projectRoot = path.resolve(import.meta.dirname, '../..');
export default defineConfig({
  root: projectRoot,
  test: { environment: 'node', include: ['client/src/**/*.test.ts'] },
});
