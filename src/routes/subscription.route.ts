import type { Router } from 'express';
import express from 'express';
import {
  createSubscription,
  deleteSubscription,
  editSubscription,
  getAllSubscriptions,
  multiDeleteSubscriptions,
} from '../controllers/subscription.controller.js';
import { verifyToken } from '../middlewares/verify.token.js';
import { validateData } from '../middlewares/validator.js';
import { subscriptionValidation } from '../validations/subscription.validation.js';

const router: Router = express.Router();

router.get('/', verifyToken, getAllSubscriptions);
router.post(
  '/',
  verifyToken,
  validateData(subscriptionValidation),
  createSubscription
);
router.put(
  '/:uid',
  verifyToken,
  validateData(subscriptionValidation),
  editSubscription
);
router.delete('/bulk-delete', verifyToken, multiDeleteSubscriptions);
router.delete('/:uid', verifyToken, deleteSubscription);

export default router;
