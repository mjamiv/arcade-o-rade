import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // CI has no GPU: serialize real WebGL sessions to avoid CPU-renderer contention.
  workers: process.env.CI ? 1 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/arcade-o-rade/',
    trace: 'retain-on-failure',
    launchOptions: {
      args: process.env.CI
        ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
        : [],
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Retain desktop input/layout while limiting software-rasterized pixels.
        ...(process.env.CI ? { viewport: { width: 960, height: 540 } } : {}),
      },
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/arcade-o-rade/',
    reuseExistingServer: !process.env.CI,
  },
});
