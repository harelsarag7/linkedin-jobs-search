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
        const exists = await Job.findOne({ email, url: job.url });
        if (!exists) {
          await Job.create({
            ...job,
            email,
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
        email: job.email
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
        email: job.email
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