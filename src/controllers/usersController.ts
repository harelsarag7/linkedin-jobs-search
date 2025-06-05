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

    async connectLinkedIn2(
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

          browser = await puppeteer.launch({
            // headless: true,
            // args: ['--no-sandbox', '--disable-setuid-sandbox'],
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1280, height: 800 },
            timeout: 60000,

            headless: !isDev,
            slowMo: 200,      // 🔍 Slow actions down so you can watch
            devtools: isDev, // 🔧 Open DevTools for debugging
            // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            // args: ['--start-maximized'], // optional: open full window
            // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // remove this line

          })
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
                // let browser: any = null;
                //   // 1) Determine the executablePath that chrome-for-testing buildpack set
                //   //    (chrome-for-testing automatically sets process.env.PUPPETEER_EXECUTABLE_PATH)
                //   browser = await puppeteer.launch({
                //     headless: !isDev, 
                //     args: [
                //       '--no-sandbox',
                //       '--disable-setuid-sandbox',
                //     ],
                //     defaultViewport: { width: 1280, height: 800 },
                //     // using https://github.com/jontewks/puppeteer-heroku-buildpack
                //     // executablePath,
                //     timeout: 60000, // 60s launch timeout
                //   });

          const page = await browser.newPage()
          
        //   await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        //   await page.setUserAgent(
        //     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        //   );

        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/137.0.0.0 Safari/537.36'
        );
                  // 3) Go to LinkedIn login page
          await page.goto('https://www.linkedin.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
            // waitUntil: 'networkidle2',
            // timeout: 60000,  
        })
    
          // 4) Fill email + password
          await page.type('input#username', linkedInEmail, { delay: 50 })
          await page.type('input#password', linkedInPassword, { delay: 50 })
    
          // 5) Click “Sign in”
          await page.click('button[aria-label="Sign in"]')
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
        
    
          const client = await page.target().createCDPSession()
          const allCookies = (await client.send('Network.getAllCookies')).cookies
          const liAtCookie = allCookies.find((c: any) => c.name === 'li_at')?.value
          
          await browser.close()
          browser = null
    
          // 8) Find the li_at cookie
          if (!liAtCookie) {
            console.error('Current URL after login:', page.url());

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
      async connectLinkedIn(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
      ): Promise<void> {
        const ourUser = req.user
        
        if (!ourUser) {
          res.status(401).json({ success: false, message: 'Not authenticated.' })
          return
        }
      
        const linkedInEmail = req.body.email as string
        const linkedInPassword = req.body.password as string
        if (!linkedInEmail || !linkedInPassword) {
          res.status(400).json({ success: false, message: 'LinkedIn email + password are required' })
          return
        }
      
        // let browser: any = null
        
        try {
          // Respond immediately to avoid Heroku timeout
          res.json({ success: true, message: 'LinkedIn connection process started. Please check back in a moment.' })
          
          // Continue processing in background
          await processLinkedInConnection(ourUser.id, linkedInEmail, linkedInPassword)
          
        } catch (err: any) {
          console.error('Error in connectLinkedIn:', err)
          // Since we already responded, log error and potentially notify user through other means
          // Could save error status to database for user to check later
        }
      }
    

    }

      
      // Separate function to handle the actual LinkedIn connection
      async function processLinkedInConnection(userId: string, email: string, password: string): Promise<void> {
        let browser: any = null
        
        try {
          console.log('🚀 Starting LinkedIn connection process for user:', userId)
          
          // Enhanced Puppeteer configuration for Heroku
          browser = await puppeteer.launch({
            headless: true, // Always headless in production
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
              '--max-old-space-size=4096'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            defaultViewport: { width: 1366, height: 768 },
            timeout: 0, // No timeout for launch
          })
      
          const page = await browser.newPage()
          
          // Set longer timeouts for navigation and waiting
          page.setDefaultNavigationTimeout(60000) // 60 seconds
          page.setDefaultTimeout(30000) // 30 seconds for other operations
          
          // Enhanced headers and user agent
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          });
          
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          );
      
          console.log('📍 Navigating to LinkedIn login page...')
          
          // Navigate with retry logic
          let loginSuccess = false
          let retryCount = 0
          const maxRetries = 3
          
          while (!loginSuccess && retryCount < maxRetries) {
            try {
              await page.goto('https://www.linkedin.com/login', {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
              })
              
              // Wait for login form to load
              await page.waitForSelector('input#username', { timeout: 10000 })
              await page.waitForSelector('input#password', { timeout: 10000 })
              
              console.log('📝 Filling login credentials...')
              
              // Clear and type credentials with human-like delays
              await page.click('input#username', { clickCount: 3 })
              await page.type('input#username', email, { delay: 100 })
              
              await page.click('input#password', { clickCount: 3 })
              await page.type('input#password', password, { delay: 100 })
              
              // Wait a bit before clicking submit
              await page.waitForTimeout(1000)
              
              console.log('🔐 Submitting login form...')
              
              // Click submit and wait for navigation
              const [response] = await Promise.all([
                page.waitForNavigation({ 
                  waitUntil: 'domcontentloaded', 
                  timeout: 45000 
                }),
                page.click('button[aria-label="Sign in"]')
              ])
              
              // Check if login was successful
              const currentUrl = page.url()
              console.log('📍 Current URL after login:', currentUrl)
              
              if (currentUrl.includes('/feed') || currentUrl.includes('/in/') || !currentUrl.includes('/login')) {
                loginSuccess = true
                console.log('✅ Login successful!')
              } else {
                throw new Error('Login may have failed - still on login page')
              }
              
            } catch (error: any) {
              retryCount++
              console.log(`⚠️ Login attempt ${retryCount} failed:`, error.message)
              
              if (retryCount < maxRetries) {
                console.log('🔄 Retrying login...')
                await page.waitForTimeout(2000) // Wait before retry
              }
            }
          }
          
          if (!loginSuccess) {
            throw new Error('Failed to login after multiple attempts')
          }
          
          // Extract cookies
          console.log('🍪 Extracting cookies...')
          const client = await page.target().createCDPSession()
          const allCookies = (await client.send('Network.getAllCookies')).cookies
          const liAtCookie = allCookies.find((c: any) => c.name === 'li_at')?.value
          
          if (!liAtCookie) {
            throw new Error('Could not extract li_at cookie from LinkedIn')
          }
          
          console.log('💾 Saving LinkedIn token for user...')
          await saveLiAtForUser(userId, liAtCookie)
          
          console.log('✅ LinkedIn connection completed successfully!')
          
        } catch (error) {
          console.error('❌ Error in processLinkedInConnection:', error)
          // You could save the error to database here for user to see later
          // await saveLinkedInConnectionError(userId, error.message)
          
        } finally {
          if (browser) {
            try {
              await browser.close()
              console.log('🔒 Browser closed')
            } catch (closeError) {
              console.error('Error closing browser:', closeError)
            }
          }
        }
      }
      
          // Helper function to implement exponential backoff for retries
      async function delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
      }
      
      // Enhanced error handling wrapper
      async function withRetry<T>(
        operation: () => Promise<T>, 
        maxRetries: number = 3,
        baseDelay: number = 1000
      ): Promise<T> {
        let lastError: Error
        
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await operation()
          } catch (error) {
            lastError = error as Error
            
            if (i === maxRetries) {
              throw lastError
            }
            
            const delayMs = baseDelay * Math.pow(2, i) // Exponential backoff
            console.log(`Retry ${i + 1}/${maxRetries} after ${delayMs}ms delay...`)
            await delay(delayMs)
          }
        }
        
        throw lastError!
      }