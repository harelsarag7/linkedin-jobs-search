const linkedIn = require('linkedin-jobs-api');
import { Request, Response, NextFunction } from 'express';
import { saveJobsForUser, updateJobStatusService } from '../services/db';
import { fetchLinkedInJobs } from '../services/recentJobs';
import { RequestWithUser } from '../types/request';
import { Job } from '../models/Job';
import { addJobNoteService, getJobNotes } from '../services/JobNote';
import { getLiAtCookie } from '../utils/utils';

export const jobsController = {
    async recentJobs(req: Request, res: Response) {
      try {
        const keyword = req.query.keyword as string || '';
        const location = req.query.location as string || '';
        const email = req.query.email as string || '';
        
        const cookie = getLiAtCookie(process.env.COOKIE || '');
        if(!cookie) {
          throw new Error('Missing li_at cookie in environment variables');
        }

        const jobs = await fetchLinkedInJobs(cookie, keyword, location);
        console.log(jobs)
        await saveJobsForUser(email, jobs);
    
        res.json({ success: true, jobs });
      } catch (error: any) {
        console.error('Error fetching recent jobs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch recent jobs.' });
      }
    },

    async updateJobStatus(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
            const { id } = req.params as { id?: string };
            const { status } = req.body;
            const user = req.user;
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not authenticated.' });
            }

            if (!id || !status) {
                return res.status(400).json({ success: false, message: 'Job ID and status are required.' });
            }

            const job = await Job.findById(id).exec()
            if (!job) {
              res.status(404).json({ success: false, message: 'Job not found.' })
              return
            }
            
            // Ensure the logged-in user owns this job
            if (job.user_id.toString() !== user._id.toString()) {
                res
                .status(403)
                .json({ success: false, message: 'Not authorized to update this job.' })
                return
            }

            const updatedJob = await updateJobStatusService(id, status);

            if (!updatedJob) {
                return res.status(404).json({ success: false, message: 'Job not found.' });
            }
            res.json({ success: true, job: updatedJob });
        } catch (error) {
            console.error('Error updating job status:', error);
            next(error);
        }
    },
    async getJobNotes(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
          const { id: jobId } = req.params as { id?: string }
          const user = req.user
    
          if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated.' })
          }
    
          if (!jobId) {
            return res.status(400).json({ success: false, message: 'Job ID is required.' })
          }
    
          const jobDoc = await Job.findById(jobId)
            .select('user_id notes')
            .lean()
            .exec()
    
          if (!jobDoc) {
            return res.status(404).json({ success: false, message: 'Job not found.' })
          }
    
          if (jobDoc.user_id.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this job.' })
          }
    
          const { notes } = await getJobNotes(jobId)
    
          return res.json({ success: true, notes })
        } catch (error) {
          console.error('Error fetching job notes:', error)
          next(error)
        }
      },

    async addJobNote(req: RequestWithUser, res: Response, next: NextFunction) {
        try {
            const { content, jobId } = req.body;
            const user = req.user;
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not authenticated.' });
            }
            if (!jobId || !content) {
                return res.status(400).json({ success: false, message: 'Job ID and note text are required.' });
            }       
            const notes = await addJobNoteService(user.id, jobId, content);
            res.json({ success: true, notes });
        } catch (error) {
            console.error('Error adding job note:', error);
            next(error);        
        }
    },  


    async searchJobs(req: Request, res: Response, next: NextFunction) {
        try {
            const { keyword, location } = req.body;
            
            const queryOptions = {
                keyword,
                location,
                limit: '10',
                // sory my date
                sortBy: "recent",
                dateSincePosted: 'past 24 hours',
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        } catch (error) {
            next(error);
        }
    },

    async advancedSearch(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                keyword,
                location,
                dateSincePosted,
                jobType,
                remoteFilter,
                salary,
                experienceLevel,
                limit,
                sortBy
            } = req.body;

            const queryOptions = {
                keyword,
                location,
                dateSincePosted,
                jobType,
                remoteFilter,
                salary,
                experienceLevel,
                limit,
                sortBy
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        } catch (error) {
            next(error);
        }
    },

    async getRecentJobs(req: Request, res: Response, next: NextFunction) {
        try {
            const queryOptions = {
                dateSincePosted: '24hr',
                sortBy: 'recent',
                limit: '20'
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        } catch (error) {
            next(error);
        }
    },

    async searchByExperience(req: Request, res: Response, next: NextFunction) {
        try {
            const { experienceLevel, keyword } = req.body;
            
            const queryOptions = {
                keyword,
                experienceLevel,
                limit: '20'
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        } catch (error) {
            next(error);
        }
    },

    async searchBySalary(req: Request, res: Response, next: NextFunction) {
        try {
            const { salary, keyword } = req.body;
            
            const queryOptions = {
                keyword,
                salary,
                limit: '20'
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        } catch (error) {
            next(error);
        }
    },

    async searchRemoteJobs(req: Request, res: Response, next: NextFunction) {
        try {
            const { keyword } = req.body;
            
            const queryOptions = {
                keyword,
                remoteFilter: 'remote',
                limit: '20'
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        } catch (error) {
            next(error);
        }
    },

    async paginatedSearch(req: Request, res: Response, next: NextFunction) {
        try {
            const { keyword, page = "0", limit = "10" } = req.body;
            
            const queryOptions = {
                keyword,
                page,
                limit
            };

            const jobs = await linkedIn.query(queryOptions);
            res.json({
                success: true,
                count: jobs.length,
                currentPage: parseInt(page),
                jobs
            });
        } catch (error) {
            next(error);
        }
    }
};