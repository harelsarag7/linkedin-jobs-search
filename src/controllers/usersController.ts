import { Response, NextFunction } from 'express';
import { getAppliedJobs, getReadyToApplyJobs } from '../services/db';
import { RequestWithUser } from '../types/request';
import { getUserStatsService, updateUserProfile } from '../services/user';
import { uploadFileToCloudinary } from '../services/cloudinary';
import fs from 'fs/promises';
import { JobType } from '../types/Jobs';

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
            openToRemote, skills, blockedCompanies, keywords
          } = req.body;
    
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
          };
    
          if (req.file) {
            const url = await uploadFileToCloudinary(user.id, req.file.path, req.file.originalname);
            updates.resumeUrl = url;
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
    }

};