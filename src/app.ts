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

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(limiter);

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
