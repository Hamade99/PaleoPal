const { defineConfig } = require('@playwright/test');
const path = require('node:path');
const os = require('node:os');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
  timeout: 60000,
  workers: 1,
  outputDir: path.join(os.tmpdir(), 'paleopal-test-results'),
  use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
  reporter: 'list'
});