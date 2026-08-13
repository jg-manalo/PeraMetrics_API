import type { Router } from 'express';
import {
  transactExpense,
  transactIncome,
  transactTransfer,
  deleteTransaction,
  getTransactions,
  generatePeriodicReport,
} from '../controllers/transaction.controller.js';
import { verifyToken } from '../middlewares/verify.token.js';
import { validateData } from '../middlewares/validator.js';
import { transactionValidation } from '../validations/transaction.validation.js';
import express from 'express';

const router: Router = express.Router();

router.get('/', verifyToken, getTransactions);
router.get('/report', verifyToken, generatePeriodicReport);
router.post(
  '/income',
  verifyToken,
  validateData(transactionValidation),
  transactIncome
);
router.post(
  '/expense',
  verifyToken,
  validateData(transactionValidation),
  transactExpense
);
router.post(
  '/transfer',
  verifyToken,
  validateData(transactionValidation),
  transactTransfer
);
router.delete('/delete/:uid', verifyToken, deleteTransaction);

export default router;
