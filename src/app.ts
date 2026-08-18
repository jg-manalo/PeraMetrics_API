import type { Express, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import moneysourceRoutes from './routes/moneysource.route.js';
import transactionRoutes from './routes/transaction.route.js';
import limiter from './middlewares/limiter.js';
import { connectRedis } from './config/redis.js';
import { errorHandler } from './middlewares/error.handler.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import logger from './config/logger.js';
import morgan from 'morgan';

const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(cookieParser());
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);

connectRedis();

app.get('/', (req: Request, res: Response) => {
  res.send('PeraMetrics API is running successfully!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/moneysources', moneysourceRoutes);
app.use('/api/transactions', transactionRoutes);

app.use(errorHandler);

export default app;
