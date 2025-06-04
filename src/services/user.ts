import { UserType } from '../types/User'
import { User } from '../models/User'
import { Job } from '../models/Job'
import { Types } from 'mongoose'


export async function createUser({email, password}: {email: string, password: string}): Promise<void> {
  if (!email) {
    console.warn('⚠️ Email is required to create a user.')
    return
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() }).exec()
    if (existingUser) {
      console.warn(`⚠️ User with email ${email} already exists.`)
      return
    }

    const newUser = new User({ email: email.toLowerCase(), password, createdAt: new Date() })
    await newUser.save()
    console.log(`✅ User created: ${email.toLowerCase()}`)
  } catch (err) {
    console.error('❌ Error creating user:', err)
  }
}

export async function findUserByEmail(email: string) {
  if (!email) return null

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).exec()
    if (!user) {
      console.warn(`⚠️ User with email ${email} not found.`)
      return null
    }
    return user
  } catch (err) {
    console.error('❌ Error finding user:', err)
    return null
  }
}
export async function updateUserProfile(
    userId: string,
    updates: Partial<Omit<UserType, '_id' | 'createdAt'>>
  ): Promise<UserType | null> {
    try {
      // Use lean() to get a plain object
      const result = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true }
      )
        .lean()
        .exec()
  
      if (!result) return null
  
      // Clean nulls to undefined and provide defaults for primitve fields
      const cleaned: UserType = {
        ...result as any,
        phone: result.phone ?? undefined,
        location: result.location ?? undefined,
        bio: result.bio ?? undefined,
        linkedinUrl: result.linkedinUrl ?? undefined,
        githubUrl: result.githubUrl ?? undefined,
        personalWebsite: result.personalWebsite ?? undefined,
        desiredJobTitle: result.desiredJobTitle ?? undefined,
        employmentType: result.employmentType ?? undefined,
  
        minSalary: result.minSalary ?? 0,
        maxSalary: result.maxSalary ?? 0,
        searchRadius: result.searchRadius ?? 0,
        openToRemote: result.openToRemote ?? false,
  
        skills: result.skills ?? [],
        blockedCompanies: result.blockedCompanies ?? [],
  
        UserAgent: result.UserAgent ?? undefined,
        li_at: result.li_at ?? undefined,
        resumeUrl: result.resumeUrl ?? undefined,
        keywords: result.keywords ?? [],
        experienceLevels: result.experienceLevels ?? [], // Default to 'entry level'
      }
  
      return cleaned
    } catch (error) {
      console.error('❌ Error updating user profile:', error)
      return null
    }
  }

export async function saveLiAtForUser(
    userId: string,
    liAtValue: string
  ): Promise<void> {
    // Example with Mongoose:
    await User.findByIdAndUpdate(userId, { li_at: liAtValue })
  }

  export async function getUserStatsService(
    user_id: string
  ): Promise<{
    totalSearched: number
    highMatches: number
    appliedJobs: number
    ReadyToApplyJobs: number
  }> {
    if (!user_id || !Types.ObjectId.isValid(user_id)) {
      return { totalSearched: 0, highMatches: 0, appliedJobs: 0, ReadyToApplyJobs: 0 }
    }
  
    try {
      // Optionally verify the user exists
      const existingUser = await User.findById(user_id).select('_id').lean().exec()
      if (!existingUser) {
        console.warn(`⚠️ User with ID ${user_id} not found.`)
        return { totalSearched: 0, highMatches: 0, appliedJobs: 0, ReadyToApplyJobs: 0 }
      }
  
      // Count all jobs for this user
      const totalJobs = await Job.countDocuments({ user_id }).exec()
  
      // Count only 'applied' jobs
      const appliedJobsCount = await Job.countDocuments({
        user_id,
        status: { $ne: 'ready_to_apply' }
      }).exec()
  
      // Compute jobs that are ready to apply (not yet applied)
      const readyToApplyCount = totalJobs - appliedJobsCount
  
      return {
        totalSearched: totalJobs,
        highMatches: 0,               // fill in logic for highMatches if you have it
        appliedJobs: appliedJobsCount,
        ReadyToApplyJobs: readyToApplyCount
      }
    } catch (err) {
      console.error('❌ Error fetching user stats:', err)
      return { totalSearched: 0, highMatches: 0, appliedJobs: 0, ReadyToApplyJobs: 0 }
    }
  }