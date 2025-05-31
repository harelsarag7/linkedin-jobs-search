// server.ts
import express from 'express';
import cors, { CorsOptions } from 'cors';
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

// Fixed CORS configuration with proper TypeScript typing
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.NODE_ENV === 'development' 
      ? ['http://localhost:8080', 'http://127.0.0.1:8080']
      : ['https://equal-try-app-d18992e2e6e0.herokuapp.com'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true, // This is crucial for cookies
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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