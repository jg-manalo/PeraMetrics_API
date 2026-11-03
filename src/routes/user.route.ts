import {
  deleteUser,
  getUserByUuid,
  updateUser,
  fetchUserCredentials,
} from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/verify.token.js';
import { checkAuthorizationForUserCredentials } from '../middlewares/check.authorization.js';
import { validateData } from '../middlewares/validator.js';
import { userUpdateValidation } from '../validations/user.validation.js';
import express from 'express';

const router = express.Router();

router.get('/me', verifyToken, getUserByUuid);
router.get('/credentials', verifyToken, fetchUserCredentials);
router.put(
  '/:uid',
  verifyToken,
  checkAuthorizationForUserCredentials,
  validateData(userUpdateValidation),
  updateUser
);
router.delete(
  '/:uid',
  verifyToken,
  checkAuthorizationForUserCredentials,
  deleteUser
);

export default router;
