import { authenticateAndCheckUser } from "middleware/authRequests";
import { usersController } from "../controllers/usersController";
import express from 'express';
import multer from 'multer';

const upload = multer({ dest: 'tmp/resumes/' });


const router = express.Router();

router.get('/', authenticateAndCheckUser, usersController.getUserData as express.RequestHandler);
router.put('/', authenticateAndCheckUser, upload.single('resume'), usersController.updateUserData as express.RequestHandler); // Assuming update uses the same handler for now
router.get('/readyToApply', authenticateAndCheckUser, usersController.readyToApply);
router.get('/appliedJobs', authenticateAndCheckUser, usersController.appliedJobs);
router.get('/stats', authenticateAndCheckUser, usersController.getUserStats as express.RequestHandler);
router.get('/recentActivity', authenticateAndCheckUser, usersController.getRecentActivity as express.RequestHandler);

export default router;