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

app.set('trust proxy', 1); // trust first proxy for Heroku

// Add debug middleware to log all cookies
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Cookies received:', req.cookies);
  console.log('Raw cookie header:', req.headers.cookie);
  next();
});

app.use(
    cors({
      origin: ['https://equal-try-app-d18992e2e6e0.herokuapp.com', 'http://localhost:8080'],
      methods: ['GET','POST','PUT','DELETE'],
      credentials: true, 
    })
);

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
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    try {
      await connectToMongo();
    } catch (err) {
      console.error('Error during startup:', err);
    }
  });