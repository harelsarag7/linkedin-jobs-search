// server.ts
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectToMongo } from './db/mongo';
import jobsRoutes from './routes/jobs';
import usersRoutes from './routes/users';
import authRoutes from './routes/auth';
import cookieParser from 'cookie-parser'

require('dotenv').config();

const app = express();
app.use(cookieParser())

app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : ['your-production-domain.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
app.use('/api/jobs', jobsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`✨ Server is running on http://localhost:${PORT}`);
    try {
      await connectToMongo();
    } catch (err) {
      console.error('Error during startup:', err);
    }
  });