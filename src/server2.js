require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const rateLimit = require('express-rate-limit');
const axios = require('axios');

app.use(cors({
    origin: process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : ['your-production-domain.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use('/api/', limiter);

const cheerio = require('cheerio');

function getLiAtCookie(cookieHeader) {
    const cookies = cookieHeader.split(";").map(c => c.trim());
    const liAt = cookies.find(c => c.startsWith("li_at="));
    return liAt ? liAt.split("=")[1] : null;
}

const puppeteer = require("puppeteer");

async function getJobDescription(url, cookie) {
    const browser = await puppeteer.launch({
        headless: false, // 🔥 Make sure browser is visible
        slowMo: 200,      // 🔍 Slow actions down so you can watch
        defaultViewport: null,
        devtools: true, // 🔧 Open DevTools for debugging
        args: ['--start-maximized'], // optional: open full window
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS Chrome path
    });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });


    // // ONLY with cookie can implement easy-apply jobs
    // other Apply method thats open a new tab we will fill the form.;

    // await page.setCookie({
    //     name: 'li_at',
    //     value: cookie,
    //     domain: '.linkedin.com',
    //     path: '/',
    //     httpOnly: true,
    //     secure: true,
    //   });
      
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    );

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForSelector('.show-more-less-html__markup', { timeout: 20000 });

        const description = await page.$eval(
            '.show-more-less-html__markup',
            (el) => el.textContent?.trim() || ''
        );

        await browser.close();
        return description;
    } catch (err) {
        await browser.close();
        console.error('Error fetching job description:', err);
        return 'No description found';
    }
}


async function fetchLinkedInJobs(keyword, location) {
    const searchUrl = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=full%20stack%20developer&location=Tel%20Aviv&f_TPR=r14200";

    const cookie = getLiAtCookie(
        'li_at=AQEDATpkXjkEA3l0AAABlxhq_boAAAGXPHeBuk4ABhrSNV4NqctNW_zy3bWWhzgtEPofejXtdhkpPQY1WaLCiB3beFRNftoLQmPO4Q4kq4Dsgk2X-OOAh8UC8c7TjvInOiEdtSnq8uZg5MRDwh1tY6iA'
    );




    const res = await axios.get(searchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'Cookie': `li_at=${cookie}`
        },
        maxRedirects: 0 // 👈 צריך להיות כאן, לא בתוך headers
    });


    const $ = cheerio.load(res.data);
    const now = new Date();
    const jobs = [];

    const cards = $('div.base-card').toArray();

    for (const el of cards) {
        const title = $(el).find("h3.base-search-card__title").text().trim();
        const company = $(el).find("h4.base-search-card__subtitle").text().trim();
        const location = $(el).find(".job-search-card__location").text().trim();
        const timeText = $(el).find("time").text().trim().toLowerCase();
        const datetime = $(el).find("time").attr("datetime");
        const url = $(el).find("a.base-card__full-link").attr("href");

        if (!datetime || !url) continue;

        const posted = new Date(datetime);
        const hoursDiff = (now - posted) / (1000 * 60 * 60);

        if (hoursDiff <= 24) {
            const description = await getJobDescription(url, cookie);
            jobs.push({ title, company, location, timeText, url, description });
        }
    }

    return jobs;
}

app.get('/api/jobs/recent', async (req, res) => {
    try {
        const keyword = req.query.keyword || '';
        const location = req.query.location || '';
        const email = req.query.email || '';

        const jobs = await fetchLinkedInJobs(keyword, location);
        // here save it to DB
        await saveJobsForUser(email, jobs);

        res.json({ success: true, jobs });
    } catch (err) {
        console.error('Error fetching jobs:', err);
        res.status(500).send('Failed to fetch jobs.');
    }
});


const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✨ Server is running on http://localhost:${PORT}`);
        console.log(`🚀 API endpoint: http://localhost:${PORT}/api`);
        console.log(`📝 Search endpoint: http://localhost:${PORT}/api/jobs/search`);
    });
}

module.exports = app;