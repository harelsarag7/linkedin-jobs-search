import cron from 'node-cron'
import { getAllUsers, saveJobsForUser } from './db'
import { fetchLinkedInJobs } from './recentJobs'

const TEL_AVIV_TZ = 'Asia/Jerusalem'

export function startLinkedInJobCron() {
  // Run every 2 hours between 08:00–20:00 Israel time
  console.log(`🔔 Starting LinkedIn Job Cron in ${TEL_AVIV_TZ} timezone`)
  console.log(`Current time in ${TEL_AVIV_TZ}: ${new Date().toLocaleString('en-US', { timeZone: TEL_AVIV_TZ })}`)
  cron.schedule('0 8-20/2 * * *', async () => {
    console.log(`🔁 Running LinkedIn Job Cron at ${new Date().toISOString()}`)

    const users = await getAllUsers()

    for (const user of users) {
      const { email, li_at, keywords, location, experienceLevels, resumeUrl } = user

      if (!li_at) continue
      if (!Array.isArray(keywords) || keywords.length === 0) continue

      const userLocation = location || 'Tel Aviv'

      for (const keyword of keywords) {
        try {
          const jobs = await fetchLinkedInJobs(li_at, keyword, userLocation, experienceLevels, resumeUrl)
          await saveJobsForUser(email, jobs)
          console.log(`✅ Saved jobs for ${email} | keyword: ${keyword}`)
        } catch (err: unknown) {
          if  (err instanceof Error) {
            console.error(`❌ Error fetching jobs for ${email} (${keyword}):`, err.message)
          } else {
            console.error(`❌ Error fetching jobs for ${email} (${keyword}):`, )
            console.error(err)
              
          }
        }
      }
    }
  }, {
    timezone: TEL_AVIV_TZ
  })
}
