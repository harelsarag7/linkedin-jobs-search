import { authenticateAndCheckUser } from '../middleware/authRequests';
import { jobsController } from '../controllers/jobsController'

import express, { RequestHandler } from 'express';

const router = express.Router();

router.get('/recent', authenticateAndCheckUser, jobsController.recentJobs);

router.put('/status/:id', authenticateAndCheckUser, jobsController.updateJobStatus as RequestHandler);
router.get('/notes/:id', authenticateAndCheckUser, jobsController.getJobNotes as RequestHandler);
router.post('/notes', authenticateAndCheckUser, jobsController.addJobNote as RequestHandler);

router.post('/search', jobsController.searchJobs);

router.post('/advanced-search', jobsController.advancedSearch);

router.get('/recentByKeywords', jobsController.getRecentJobs);

router.post('/by-experience', jobsController.searchByExperience);

router.post('/by-salary', jobsController.searchBySalary);

router.post('/remote', jobsController.searchRemoteJobs);

router.post('/paginated', jobsController.paginatedSearch);


export default router;