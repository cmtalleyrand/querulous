// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173/querulous/',
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: 'on',
  },
  reporter: [['list']],
});
