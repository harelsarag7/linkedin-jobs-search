import axios from "axios";
import { getLiAtCookie } from "../utils/utils";
import { getJobDescription } from "./jobDescription";
import * as cheerio from "cheerio";

export const fetchLinkedInJobs = async (keyword: string, location: string): Promise<any[]> => {
  const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&f_TPR=r44200`;

  const cookie = getLiAtCookie(process.env.COOKIE || '');
  if(!cookie) {
    throw new Error('Missing li_at cookie in environment variables');
  }
  const res = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cookie': `li_at=${cookie}`
    },
    maxRedirects: 0
  });

  const $ = cheerio.load(res.data);
  const now = new Date();
  const jobs: any[] = [];

  $('div.base-card').each((_, el) => {
    const title = $(el).find("h3.base-search-card__title").text().trim();
    const company = $(el).find("h4.base-search-card__subtitle").text().trim();
    const location = $(el).find(".job-search-card__location").text().trim();
    const timeText = $(el).find("time").text().trim().toLowerCase();
    const datetime = $(el).find("time").attr("datetime");
    const url = $(el).find("a.base-card__full-link").attr("href");

    if (!datetime || !url) return;
    const posted = new Date(datetime);
    const hoursDiff = (now.getTime() - posted.getTime()) / (1000 * 60 * 60);

    // if (hoursDiff <= 24) {
      jobs.push({ title, company, location, timeText, url });
    // }
  });

  for (const job of jobs) {
    job.description = await getJobDescription(job.url);
  }

  return jobs;
};
