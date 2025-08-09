import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.{ts,js}','test/**/*.{ts,js}'],
    globals: true,
  },
})
