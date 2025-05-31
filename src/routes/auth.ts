import { authController } from "controllers/authController";
import express, { RequestHandler } from 'express';

const router = express.Router();

router.post('/register', authController.register as RequestHandler);
router.post('/login', authController.login as RequestHandler);
router.get('/verify', authController.verify as RequestHandler);
router.delete("/deleteTokens", authController.deleteTokens as RequestHandler);

export default router;