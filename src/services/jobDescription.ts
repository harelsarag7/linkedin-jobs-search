import puppeteer from "puppeteer";

const isDev = process.env.NODE_ENV === "development";
export const getJobDescription = async (url: string): Promise<string> => {
    const browser = await puppeteer.launch({
      headless: isDev ? false: true,
      slowMo: 200,
      defaultViewport: null,
      devtools: true,
      args: ['--start-maximized'],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
