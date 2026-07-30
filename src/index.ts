import type {Express, Request, Response} from 'express';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route'
import userRoutes from './routes/user.route'
import moneysourceRoutes from './routes/moneysource.route'
import transactionRoutes from './routes/transaction.route'
import limiter from './middlewares/limiter';

const app: Express = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(limiter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


app.get('/', (req: Request, res: Response) => {
    res.send('PeraMetrics API is running successfully!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/moneysources', moneysourceRoutes);
app.use('/api/transactions', transactionRoutes);