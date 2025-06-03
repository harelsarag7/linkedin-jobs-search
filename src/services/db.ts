import { extractJobId } from '../utils/utils';
import { Job } from '../models/Job';
import { User } from '../models/User';
export const saveJobsForUser = async (email: string, jobs: any[]) => {
    if (!email || !Array.isArray(jobs) || jobs.length === 0) return;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.warn(`⚠️ User with email ${email} not found.`);
        return;
      }
  

      for (const job of jobs) {
        const jobId = extractJobId(job.url);
        if (!jobId) {
          console.warn(`⚠️ Could not extract jobId from: ${job.url}`);
          continue;
        }
      
        const exists = await Job.findOne({ email, jobId });
        if (!exists) {
          await Job.create({
            ...job,
            email,
            jobId,
            status: 'ready_to_apply',
            user_id: user._id,
          });
          console.log(`✅ Inserted: ${job.title}`);
        } else {
          console.log(`⏭️ Skipped (already exists): ${job.title}`);
        }
      }
    } catch (err) {
      console.error('❌ Error saving jobs:', err);
    }
  };
  

  export async function getReadyToApplyJobs(
    email: string
  ): Promise<
    Array<{
      title: string
      company?: string
      location?: string
      timeText?: string
      url: string
      description?: string
    }>
  > {
    if (!email) return []
  
    try {
      const user = await User.findOne({ email }).exec()
      if (!user) {
        console.warn(`⚠️ User with email ${email} not found.`)
        return []
      }
  
      const jobs = await Job.find({
        user_id: user._id,
        status: 'ready_to_apply',
      }).exec()
  
      return jobs.map(job => ({
        title: job.title!,
        url: job.url,   
        ...(job.company != null && { company: job.company }),
        ...(job.location != null && { location: job.location }),
        ...(job.timeText != null && { timeText: job.timeText }),
        ...(job.description != null && { description: job.description }),
        id: job._id.toString(),
        status: job.status,
        appliedAt: job.appliedAt ? job.appliedAt.toISOString() : null,
        savedAt: job.savedAt ? job.savedAt.toISOString() : null,
        user_id: job.user_id.toString(),
        email: job.email,
        companyLogo: job.companyLogo,
        agoTime: job.agoTime,
        salary: job.salary
      }))
    } catch (err) {
      console.error('❌ Error fetching ready-to-apply jobs:', err)
      return []
    }
  }

  export async function getAppliedJobs(
    email: string
  ): Promise<
    Array<{
      title: string
      company?: string
      location?: string
      timeText?: string
      url: string
      description?: string
    }>
  > {
    if (!email) return []
    try {
      const user = await User.findOne({ email }).exec()
      if (!user) {
        console.warn(`⚠️ User with email ${email} not found.`)      
        return []   
      }
      const jobs = await Job.find({
        user_id: user._id,
        status: { $ne: 'ready_to_apply' }
      }).exec()
      
      return jobs.map(job => ({
        title: job.title!,
        url: job.url,   
        ...(job.company != null && { company: job.company }),
        ...(job.location != null && { location: job.location }),
        ...(job.timeText != null && { timeText: job.timeText }),
        ...(job.description != null && { description: job.description }),
        id: job._id.toString(),
        status: job.status,
        appliedAt: job.appliedAt ? job.appliedAt.toISOString() : null,
        savedAt: job.savedAt ? job.savedAt.toISOString() : null,
        user_id: job.user_id.toString(),
        email: job.email,
        companyLogo: job.companyLogo,
        agoTime: job.agoTime,
        salary: job.salary
      }))
    } catch (err) {
      console.error('❌ Error fetching applied jobs:', err)
      return []
    }
  }

  export async function updateJobStatusService( 
    jobId: string,
    status: 'ready_to_apply' | 'applied' | 'interviewing' | 'offer' | 'rejected'
  ): Promise<any> {
    if (!jobId || !status) return null
  
    try {
      const updatePayload: Record<string, any> = { status }
        if (status === 'applied') {
          updatePayload.appliedAt = new Date()
        }
        const updatedJob = await Job.findByIdAndUpdate(
          jobId,
          updatePayload,
          { new: true }
        ).exec()
        
  
      return updatedJob
    } catch (err) {
      console.error('❌ Error updating job status:', err)
      return null
    }
  }

  export async function getAllUsers(): Promise<any[]> {
    try {
      // Include li_at, keywords, and location in the projection
      const users = await User.find({}, 'email li_at keywords location').exec();
      return users.map(user => ({
        id: user._id.toString(),
        email: user.email,
        li_at: user.li_at,
        keywords: user.keywords || [],
        location: user.location || '',
      }));
    } catch (err) {
      console.error('❌ Error fetching all users:', err);
      return [];
    }
  }
  