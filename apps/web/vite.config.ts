import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// @somacast/core is a local TypeScript package (file:../../packages/core); Vite compiles its source.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: ['../..'] }, // lets the dev server read packages/core
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
