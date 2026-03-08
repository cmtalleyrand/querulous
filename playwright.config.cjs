// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5174/querulous/',
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: 'on',
    launchOptions: {
      executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell',
    },
  },
  reporter: [['list']],
});
