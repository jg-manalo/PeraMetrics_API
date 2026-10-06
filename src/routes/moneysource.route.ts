import type { Router } from 'express';
import {
  createMoneySource,
  deleteMoneySource,
  editMoneySource,
  getAllMoneySources,
  getMoneySourcesAsInput,
  multiDeleteMoneySources,
} from '../controllers/moneysource.controller.js';
import { verifyToken } from '../middlewares/verify.token.js';
import { validateData } from '../middlewares/validator.js';
import { moneySourceValidation } from '../validations/moneysource.validation.js';
import express from 'express';

const router: Router = express.Router();

router.get('/', verifyToken, getAllMoneySources);
router.get('/input', verifyToken, getMoneySourcesAsInput);
router.post(
  '/',
  verifyToken,
  validateData(moneySourceValidation),
  createMoneySource
);
router.put(
  '/:uid',
  verifyToken,
  validateData(moneySourceValidation),
  editMoneySource
);

router.delete('/bulk-delete', verifyToken, multiDeleteMoneySources);

router.delete('/:uid', verifyToken, deleteMoneySource);

export default router;
