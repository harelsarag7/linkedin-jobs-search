import { Response, NextFunction } from 'express';
import { getAppliedJobs, getReadyToApplyJobs } from '../services/db';
import { RequestWithUser } from '../types/request';
import { getUserStatsService, saveLiAtForUser, updateUserProfile } from '../services/user';
import { uploadFileToCloudinary } from '../services/cloudinary';
import fs from 'fs/promises';
import { JobType } from '../types/Jobs';
import puppeteer from 'puppeteer';
import { extractKeywordsFromResumeUrl } from '../services/openai';

const isDev = process.env.NODE_ENV === "development";

export const usersController = {
    async getUserData(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
            const { user } = req;
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not authenticated.' });
            }
            console.log(`Fetching user data for email: ${user.email}`);
            res.json({ success: true, user });
        } catch (error: any) {
            console.error('Error fetching user data:', error);
            next(error);
        }
    },
    async updateUserData(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
      ): Promise<void> {
        try {
          const user = req.user;
          if (!user) {
            res.status(401).json({ success: false, message: 'Not authenticated.' });
            return;
          }
    
          const {
            fullName, phone, email, location, bio,
            linkedinUrl, githubUrl, personalWebsite, desiredJobTitle,
            employmentType, minSalary, maxSalary, searchRadius,
            openToRemote, skills, blockedCompanies, keywords, experienceLevels
          } = req.body;
    
          let parsedExperienceLevels: string[] = [];
            if (typeof experienceLevels === 'string') {
            try {
                parsedExperienceLevels = JSON.parse(experienceLevels);
            } catch (err) {
                console.error("❌ Failed to parse experienceLevels:", experienceLevels);
            }
            } else if (Array.isArray(experienceLevels)) {
            parsedExperienceLevels = experienceLevels;
            }


          const updates: Partial<typeof user> = {
            ...(fullName && { fullName }),
            ...(phone && { phone }),
            ...(email && { email }),
            ...(location && { location }),
            ...(bio && { bio }),
            ...(linkedinUrl && { linkedinUrl }),
            ...(githubUrl && { githubUrl }),
            ...(personalWebsite && { personalWebsite }),
            ...(desiredJobTitle && { desiredJobTitle }),
            ...(employmentType && { employmentType }),
            ...(minSalary !== undefined && { minSalary }),
            ...(maxSalary !== undefined && { maxSalary }),
            ...(searchRadius !== undefined && { searchRadius }),
            ...(openToRemote !== undefined && { openToRemote }),
            ...(skills && { skills }),
            ...(blockedCompanies && { blockedCompanies }),
            ...(keywords && { keywords }),
            ...(parsedExperienceLevels.length && { experienceLevels: parsedExperienceLevels }),
        };
    
          if (req.file) {
            const url = await uploadFileToCloudinary(user.id, req.file.path, req.file.originalname);
            updates.resumeUrl = url;
            // 2. Extract top 5 keywords via OpenAI
            const topKeywords = await extractKeywordsFromResumeUrl(url);
            const existing = Array.isArray(user.keywords) ? user.keywords : [];
            updates.keywords = Array.from(new Set([...existing, ...topKeywords]));
            
            await fs.unlink(req.file.path);
          }
    
          const updated = await updateUserProfile(user.id, updates);
          if (!updated) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
          }
    
          res.json({ success: true, user: updated });
        } catch (err) {
          next(err);
        }
      },
    
    async readyToApply(req: RequestWithUser, res: Response, next: NextFunction) {
      try {
        const { user } = req;
        const email = user?.email;

        console.log (`Fetching ready to apply jobs for email: ${email}`);
        const jobs = await getReadyToApplyJobs(email);
        res.json({ success: true, jobs });
      } catch (error: any) {
        console.error('Error fetching recent jobs:', error);
        next(error);
      }
    },

    async appliedJobs(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
            const { user } = req;
            const email = user?.email;

            console.log(`Fetching applied jobs for email: ${email}`);
            const jobs = await getAppliedJobs(email);      
            res.json({ success: true, jobs });
        } catch (error: any) {
            console.error('Error fetching applied jobs:', error);
            next(error);
        }
    },
    async getUserStats(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
            const { user } = req;
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not authenticated.' });
            }

            const stats = await getUserStatsService(user.id);

            console.log(`Fetching user stats for email: ${user.email}`);
            res.json({ success: true, stats });
        } catch (error: any) {
            console.error('Error fetching user stats:', error);
            next(error);
        }
    },

    async getRecentActivity(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
            const { user } = req;
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not authenticated.' });
            }

            const appliedJobs = (await getAppliedJobs(user.email)) as JobType[]
            const readyToApplyJobs = (await getReadyToApplyJobs(user.email)) as JobType[]
      
            // 2) Merge and add a `date` field to each job for sorting
            const unified = [
              ...appliedJobs.map(job => ({
                ...job,
                date: job.appliedAt || '', // use appliedAt for applied jobs
              })),
              ...readyToApplyJobs.map(job => ({
                ...job,
                date: job.savedAt || '',   // use savedAt for ready-to-apply jobs
              })),
            ]
      
            // 3) Sort by `date` descending (newest first)
            unified.sort((a, b) => {
              // Convert ISO strings into timestamps
              const timeA = new Date(a.date).getTime()
              const timeB = new Date(b.date).getTime()
              return timeB - timeA
            })
      
            // 4) Take the first 10 items (or fewer) and strip out the `date` field
            const lastTen: JobType[] = unified
              .slice(0, 10)
              .map(({ date, ...job }) => job)
      
            console.log(`Fetching recent activity for email: ${user.email}`)
            return res.json({ success: true, recentActivity: lastTen })
        } catch (error: any) {
            console.error('Error fetching recent activity:', error);
            next(error);
        }
    },

    async connectLinkedIn(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
      ): Promise<void> {
        const ourUser = req.user
        // const userAgent = req.headers['user-agent'] || ''
        const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
        if (!ourUser) {
          res.status(401).json({ success: false, message: 'Not authenticated.' })
          return
        }
    
        const linkedInEmail = req.body.email as string
        const linkedInPassword = req.body.password as string
        if (!linkedInEmail || !linkedInPassword) {
          res
            .status(400)
            .json({ success: false, message: 'LinkedIn email + password are required' })
          return
        }
    
        let browser: any = null
        try {
        //   // 2) Launch Puppeteer
        //   console.log('🐧 Puppeteer exec path:', await puppeteer.executablePath());

        //   browser = await puppeteer.launch({
        //     // headless: true,
        //     args: ['--no-sandbox', '--disable-setuid-sandbox'],

        //     headless: isDev ? false: true, // 🔥 Make sure browser is visible
        //     slowMo: 200,      // 🔍 Slow actions down so you can watch
        //     defaultViewport: null,
        //     devtools: true, // 🔧 Open DevTools for debugging
        //     // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        //     // args: ['--start-maximized'], // optional: open full window
        //     // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // remove this line

        //   })
        // 2) Launch Puppeteer
                // console.log('🐧 Environment check:');
                // console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
                // console.log('CHROME_PATH:', process.env.CHROME_PATH);

                // // Determine the correct executable path
                // const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
                //                     process.env.CHROME_PATH || 
                //                     '/app/.chromium/bin/chrome';

                // console.log('🐧 Using executable path:', executablePath);

                // browser = await puppeteer.launch({
                // headless: !isDev, // Use headless in production
                // args: [
                //     '--no-sandbox',
                //     '--disable-setuid-sandbox',
                //     '--disable-dev-shm-usage',
                //     '--disable-accelerated-2d-canvas',
                //     '--no-first-run',
                //     '--no-zygote',
                //     '--single-process', // Important for Heroku
                //     '--disable-gpu'
                // ],
                // executablePath: executablePath,
                // slowMo: isDev ? 200 : 0,
                // defaultViewport: null,
                // devtools: isDev
                // });
                let browser: any = null;
                  // 1) Determine the executablePath that chrome-for-testing buildpack set
                  //    (chrome-for-testing automatically sets process.env.PUPPETEER_EXECUTABLE_PATH)
                  const executablePath = await puppeteer.executablePath();
      console.log('🐧 Found Puppeteer Chromium at:', executablePath);
                  // 2) Launch Puppeteer with only the required flags
                  browser = await puppeteer.launch({
                    headless: !isDev, 
                    args: [
                      '--no-sandbox',
                      '--disable-setuid-sandbox',
                    ],
                    defaultViewport: { width: 1280, height: 800 },
                    // using https://github.com/jontewks/puppeteer-heroku-buildpack
                    // executablePath,
                    timeout: 60000, // 60s launch timeout
                  });

          const page = await browser.newPage()
          
          await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
          await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
          );

          // 3) Go to LinkedIn login page
          await page.goto('https://www.linkedin.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          })
    
          // 4) Fill email + password
          await page.type('input#username', linkedInEmail, { delay: 50 })
          await page.type('input#password', linkedInPassword, { delay: 50 })
    
          // 5) Click “Sign in”
          await page.click('button[aria-label="Sign in"]')
    
          const client = await page.target().createCDPSession()
          const allCookies = (await client.send('Network.getAllCookies')).cookies
          const liAtCookie = allCookies.find((c: any) => c.name === 'li_at')?.value
          
          await browser.close()
          browser = null
    
          // 8) Find the li_at cookie
          if (!liAtCookie) {
            res
              .status(500)
              .json({ success: false, message: 'Could not extract li_at from LinkedIn' })
            return
          }
    
          // 9) Persist that li_at value for our user
          await saveLiAtForUser(ourUser.id, liAtCookie)
    
          // 10) Return success to frontend
          res.json({ success: true, message: 'LinkedIn account linked successfully.' })
          return
        } catch (err: any) {
          console.error('Error in connectLinkedIn:', err)
          if (browser) {
            try {
              await browser.close()
            } catch {} // ignore
          }
          res.status(500).json({ success: false, message: 'Unexpected error. Please try again.' })
          return
        }
      },
    }