import express from 'express';
import {transactExpense, transactIncome, transactTransfer, deleteTransaction, getTransactions, generatePeriodicReport} from '../controllers/transaction.controller';
import {verifyToken} from '../middlewares/verify.token';
import type {Router} from 'express';
import {validateData} from '../middlewares/validator';
import {transactionValidation} from '../validations/transaction.validation';

const router: Router = express.Router();

router.get('/', verifyToken, getTransactions);
router.get('/report', verifyToken, generatePeriodicReport);
router.post('/income', verifyToken, validateData(transactionValidation), transactIncome);
router.post('/expense', verifyToken,validateData(transactionValidation) ,transactExpense);
router.post('/transfer', verifyToken, validateData(transactionValidation), transactTransfer);
router.delete('/delete/:uid', verifyToken, deleteTransaction);

export default router;