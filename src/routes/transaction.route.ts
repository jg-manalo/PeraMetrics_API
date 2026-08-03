import express from 'express';
import {transactExpense, transactIncome, transactTransfer, deleteTransaction, getTransactions} from '../controllers/transaction.controller';
import {verifyToken} from '../middlewares/verify.token';
import type {Router} from 'express';

const router: Router = express.Router();

router.get('/', verifyToken, getTransactions);
router.post('/income', verifyToken, transactIncome);
router.post('/expense', verifyToken, transactExpense);
router.post('/transfer', verifyToken, transactTransfer);
router.delete('/delete/:uid', verifyToken, deleteTransaction);

export default router;