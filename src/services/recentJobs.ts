import axios from "axios";
import { getJobDescription } from "./jobDescription";
import * as cheerio from "cheerio";
import { experienceRange } from "../utils/utils";
import { detectMatchScore, extractTextFromResumeUrl } from "./openai";

type ExperienceLevel = keyof typeof experienceRange;

export const fetchLinkedInJobs = async (cookie: string, keyword: string, location: string, experienceLevels: ExperienceLevel[], resumeUrl: string | undefined): Promise<any[]> => {
  let searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&f_TPR=r7200`;

  if (experienceLevels && experienceLevels.length) {
    const encodedExperience = `&f_E=${experienceLevels
      .map(level => experienceRange[level])
      .filter(Boolean)
      .join(',')}`;
    searchUrl += encodedExperience;
  }


  const res = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cookie': `li_at=${cookie}`
    },
    maxRedirects: 0,
    // validateStatus: function (status) {
    //     return status === 200;
    // },
    // timeout: 10000,
  });
  const jobs = parseJobList(res.data);

  
//   const $ = cheerio.load(res.data);
//   const now = new Date();
//   const jobs: any[] = [];

//   $('div.base-card').each((_, el) => {
//     const title = $(el).find("h3.base-search-card__title").text().trim();
//     const company = $(el).find("h4.base-search-card__subtitle").text().trim();
//     const location = $(el).find(".job-search-card__location").text().trim();
//     const timeText = $(el).find("time").text().trim().toLowerCase();
//     const datetime = $(el).find("time").attr("datetime");
//     const url = $(el).find("a.base-card__full-link").attr("href");

//     if (!datetime || !url) return;
//     const posted = new Date(datetime);
//     const hoursDiff = (now.getTime() - posted.getTime()) / (1000 * 60 * 60);

//     // if (hoursDiff <= 24) {
//       jobs.push({ title, company, location, timeText, url });
//     // }
//   });

  // description fetching is commented out to avoid long execution time
    let resumeText = "";
    if(resumeUrl) {
        resumeText = await extractTextFromResumeUrl(resumeUrl);
        }
    for (const job of jobs) {
        job.description = await getJobDescription(job.url);
        if(job.description && resumeText) {
            job.matchScore = await detectMatchScore(job.description, resumeText)
        }
    }

    return jobs;
};


function parseJobList(jobData: any) {
    try {
      const $ = cheerio.load(jobData);
      const jobs = $("li");
  
      return jobs
        .map((index, element) => {
          try {
            const job = $(element);
            const title = job.find(".base-search-card__title").text().trim();
            const company = job.find(".base-search-card__subtitle").text().trim();
            const location = job.find(".job-search-card__location").text().trim();
            const dateElement = job.find("time");
            const datetime = dateElement.attr("datetime") || "";
            const timeText = dateElement.text().trim().toLowerCase();
            const salary = job
              .find(".job-search-card__salary-info")
              .text()
              .trim()
              .replace(/\s+/g, " ");
            const url = job.find(".base-card__full-link").attr("href") || "";
            const companyLogo = job
              .find(".artdeco-entity-image")
              .attr("data-delayed-url") || "";
            const agoTime = job.find(".job-search-card__listdate").text().trim();
  
            if (!title || !company) {
              return null;
            }
  
            return {
              title,
              company,
              location,
              timeText,
              url,
              salary: salary || "Not specified",
              companyLogo,
              agoTime,
              description: "", // Placeholder for description, will be filled later
              matchScore: 0,
            };
          } catch (err: unknown) {
            console.warn(`Error parsing job at index ${index}:`, err);
            return null;
          }
        })
        .get()
        .filter(Boolean);
    } catch (error) {
      console.error("Error parsing job list:", error);
      return [];
    }
  }
  