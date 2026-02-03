const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const logger = require('../utils/logger');

chromium.use(stealth);

class BaseScraper {
  constructor(bookmakerName, config) {
    this.name = bookmakerName;
    this.config = config;
    this.browser = null;
    this.context = null;
    this.isRunning = false;
  }

  async init() {
  try {
    this.browser = await chromium.launch({
      headless: false, // Set to true later
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    // Build context options
    const contextOptions = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata'
    };

    // Only add proxy if server is provided
    if (this.config?.proxy?.server) {
      contextOptions.proxy = {
        server: this.config.proxy.server,
        username: this.config.proxy.username,
        password: this.config.proxy.password
      };
    }

    this.context = await this.browser.newContext(contextOptions);

    // Add human-like scripts
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });

    console.log(`${this.name}: Browser initialized`);
  } catch (error) {
    console.error(`${this.name}: Init failed`, error);
    throw error;
  }
}

  async close() {
    if (this.browser) await this.browser.close();
    this.isRunning = false;
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async handleCloudflare(page) {
    // Check for Cloudflare challenge
    const cfCheck = await page.$('.cf-browser-verification, #cf-content');
    if (cfCheck) {
      logger.warn(`${this.name}: Cloudflare detected, waiting...`);
      await page.waitForTimeout(8000);
      await page.waitForLoadState('networkidle');
    }
  }
}

module.exports = BaseScraper;