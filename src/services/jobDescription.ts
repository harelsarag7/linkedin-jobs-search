import puppeteer from "puppeteer";

const isDev = process.env.NODE_ENV === "development";
export const getJobDescription = async (url: string): Promise<string> => {
    const browser = await puppeteer.launch({
      headless: isDev ? false: true,
      devtools: isDev,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Important for Heroku
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max-old-space-size=4096',
        '--disable-blink-features=AutomationControlled', // Hide automation flags
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--window-size=1366,768'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      defaultViewport: null, // Use full window size
      timeout: 0, // No timeout for launch
    });
    const page = await browser.newPage();
  
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    );
  
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.show-more-less-html__markup', { timeout: 20000 });
      const description = await page.$eval(
        '.show-more-less-html__markup',
        el => (el.textContent?.trim() || '')
      );
      await browser.close();
      return description;
    } catch (err) {
      await browser.close();
      console.error('Error fetching job description:', err);
      return 'No description found';
    }
  };
