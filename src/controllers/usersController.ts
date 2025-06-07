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
            language, fullName, phone, email, location, bio,
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
            ...(language && { language }),
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
      
      // Enhanced Puppeteer configuration for Heroku with stealth techniques
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
      })
  
      const page = await browser.newPage()
      
      // Set longer timeouts for navigation and waiting
      page.setDefaultNavigationTimeout(60000) // 60 seconds
      page.setDefaultTimeout(30000) // 30 seconds for other operations
      
// ... inside your Puppeteer setup
await page.evaluateOnNewDocument(() => {
    // Hide webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  
    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  
    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  
    // Override permissions.query with a proper PermissionStatus object
    const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
    window.navigator.permissions.query = (parameters: any): Promise<PermissionStatus> => {
      if (parameters.name === 'notifications') {
        // Return a fake PermissionStatus with all required properties
        const fakeStatus = {
          state: 'granted' as PermissionState,
          onchange: null,
          addEventListener: (_: string, __: any) => {},
          removeEventListener: (_: string, __: any) => {},
          dispatchEvent: (_: Event) => false,
        } as PermissionStatus;
  
        return Promise.resolve(fakeStatus);
      }
      return originalQuery(parameters);
    };
  });
  
      
      // Enhanced headers and user agent
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
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
          // Navigate with retry logic and human-like behavior
          await page.goto('https://www.linkedin.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          })
          
          // Add some random delay to appear more human
          await page.waitForTimeout(Math.random() * 2000 + 1000)
          
          // Wait for login form to load
          await page.waitForSelector('input#username', { timeout: 10000 })
          await page.waitForSelector('input#password', { timeout: 10000 })
          
          console.log('📝 Filling login credentials...')
          
          // Human-like form filling with random delays
          await page.focus('input#username')
          await page.waitForTimeout(Math.random() * 500 + 200)
          
          // Type email character by character with random delays
          for (const char of email) {
            await page.keyboard.type(char)
            await page.waitForTimeout(Math.random() * 100 + 50)
          }
          
          await page.waitForTimeout(Math.random() * 500 + 300)
          
          await page.focus('input#password')
          await page.waitForTimeout(Math.random() * 500 + 200)
          
          // Type password character by character
          for (const char of password) {
            await page.keyboard.type(char)
            await page.waitForTimeout(Math.random() * 100 + 50)
          }
          
          // Random delay before submitting
          await page.waitForTimeout(Math.random() * 1000 + 500)
          
          console.log('🔐 Submitting login form...')
          
          // Click submit and wait for navigation with better error handling
          try {
            const [response] = await Promise.all([
              page.waitForNavigation({ 
                waitUntil: 'domcontentloaded', 
                timeout: 45000 
              }),
              page.click('button[aria-label="Sign in"]')
            ])
            
            // Log response status for debugging
            if (response) {
              console.log('📡 Navigation response status:', response.status())
            }
            
          } catch (navError: any) {
            console.log('⚠️ Navigation wait failed, but continuing:', navError?.message)
            // Sometimes the navigation completes but waitForNavigation times out
            // Let's continue and check the URL
            await page.waitForTimeout(3000)
          }
          
          // Check if login was successful or if we hit a challenge
          const currentUrl = page.url()
          console.log('📍 Current URL after login:', currentUrl)
          
          if (currentUrl.includes('/checkpoint/challenge')) {
            console.log('🔐 LinkedIn security challenge detected. Attempting to handle...')
            
            // Handle security challenge
            const challengeHandled = await handleLinkedInChallenge(page)
            
            if (!challengeHandled) {
              throw new Error('Could not complete LinkedIn security challenge. Please try logging in manually first.')
            }
            
            loginSuccess = true
            console.log('✅ Security challenge completed!')
            
          } else if (currentUrl.includes('/feed') || currentUrl.includes('/in/') || !currentUrl.includes('/login')) {
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
      
      // Extract cookies with better error handling
      console.log('🍪 Extracting cookies...')
      
      // Wait a moment for all cookies to be set
      await page.waitForTimeout(2000)
      
      const client = await page.target().createCDPSession()
      await client.send('Network.enable');           // ← add this
      const allCookies = (await client.send('Network.getAllCookies')).cookies
      
      console.log('🍪 Total cookies found:', allCookies.length)
      console.log('🍪 Cookie names:', allCookies.map((c: any) => c.name).join(', '))
      
      const liAtCookie = allCookies.find((c: any) => c.name === 'li_at')?.value
        console.log(`🍪 li_at cookie: ${liAtCookie}`);
      if (!liAtCookie) {
        // Try alternative cookie extraction method
        const cookiesFromPage = await page.cookies()
        console.log('🍪 Page cookies:', cookiesFromPage.map((c: any) => c.name).join(', '))
        
        const altLiAtCookie = cookiesFromPage.find((c: any)=> c.name === 'li_at')?.value
        
        if (!altLiAtCookie) {
          // If still no cookie, check if we're actually logged in
          const isLoggedIn = await checkIfLoggedIn(page)
          if (isLoggedIn) {
            throw new Error('Login successful but li_at cookie not found. LinkedIn may have changed their cookie structure.')
          } else {
            throw new Error('Login failed - no authentication cookie found and user not logged in')
          }
        } else {
          console.log('✅ Found li_at cookie using alternative method')
          await saveLiAtForUser(userId, altLiAtCookie)
        }
      } else {
        console.log('✅ Found li_at cookie using CDP method')
        await saveLiAtForUser(userId, liAtCookie)
      }
      
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
  
  // Helper function to handle LinkedIn security challenges
  async function handleLinkedInChallenge(page: any): Promise<boolean> {
    try {
      console.log('🔍 Analyzing challenge page...')
      
      // Wait for challenge page to load
      await page.waitForTimeout(3000)
      
      // Check for different types of challenges
      const challengeText = await page.evaluate(() => {
        return document.body.innerText.toLowerCase()
      })
      
      console.log('📝 Challenge page content preview:', challengeText.substring(0, 200))
      
      // Handle email verification challenge
      if (challengeText.includes('verify') && challengeText.includes('email')) {
        console.log('📧 Email verification challenge detected')
        
        // Look for email input or confirmation button
        const emailInput = await page.$('input[type="email"]')
        if (emailInput) {
          // This might require the user's email - for now, let's skip
          console.log('⚠️ Email verification required - manual intervention needed')
          return false
        }
        
        // Look for "Send verification" or similar buttons
        const sendButton = await page.$('button[data-litms-control-urn*="verify"]')
        if (sendButton) {
          console.log('📤 Clicking send verification button...')
          await sendButton.click()
          await page.waitForTimeout(2000)
        }
      }
      
      // Handle phone verification challenge
      if (challengeText.includes('phone') && challengeText.includes('verify')) {
        console.log('📱 Phone verification challenge detected')
        console.log('⚠️ Phone verification required - manual intervention needed')
        return false
      }
      
      // Handle CAPTCHA challenge
      if (challengeText.includes('captcha') || challengeText.includes('robot')) {
        console.log('🤖 CAPTCHA challenge detected')
        console.log('⚠️ CAPTCHA verification required - manual intervention needed')
        return false
      }
      
      // Handle "suspicious activity" challenge
      if (challengeText.includes('suspicious') || challengeText.includes('unusual')) {
        console.log('🚨 Suspicious activity challenge detected')
        
        // Sometimes there's a "Continue" button we can click
        const continueButton = await page.$('button[data-litms-control-urn*="continue"]') || 
                             await page.$('button:contains("Continue")') ||
                             await page.$('input[value*="Continue"]')
        
        if (continueButton) {
          console.log('➡️ Clicking continue button...')
          await continueButton.click()
          await page.waitForTimeout(3000)
          
          // Check if we moved past the challenge
          const newUrl = page.url()
          if (!newUrl.includes('/checkpoint/challenge')) {
            console.log('✅ Successfully bypassed suspicious activity challenge')
            return true
          }
        }
      }
      
      // Wait a bit and check if challenge resolved itself
      await page.waitForTimeout(5000)
      const finalUrl = page.url()
      
      if (!finalUrl.includes('/checkpoint/challenge')) {
        console.log('✅ Challenge appears to have been resolved')
        return true
      }
      
      console.log('❌ Challenge could not be automatically resolved')
      return false
      
    } catch (error) {
      console.error('Error handling LinkedIn challenge:', error)
      return false
    }
  }
  
  // Helper function to check if user is actually logged in
  async function checkIfLoggedIn(page: any): Promise<boolean> {
    try {
      // Try to navigate to a page that requires authentication
      await page.goto('https://www.linkedin.com/feed', { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      
      // If we're redirected back to login, we're not logged in
      if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
        return false
      }
      
      // Check for elements that indicate we're logged in
      const loggedInIndicators = await page.evaluate(() => {
        // Look for common logged-in elements
        const feedElements = document.querySelectorAll('[data-module="feed"]')
        const navElements = document.querySelectorAll('nav')
        const profileElements = document.querySelectorAll('[data-control-name="nav.settings_profile"]')
        
        return feedElements.length > 0 || navElements.length > 0 || profileElements.length > 0
      })
      
      return loggedInIndicators
      
    } catch (error) {
      console.error('Error checking login status:', error)
      return false
    }
  }
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