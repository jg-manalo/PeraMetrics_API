import express from 'express';
import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  refreshToken,
  logoutUser,
  getUserWithToken,
} from '../controllers/auth.controller.js';
import { validateData } from '../middlewares/validator.js';
import { userValidation } from '../validations/user.validation.js';
import { updatePasswordValidation } from '../validations/user.validation.js';
import { verifyToken } from '../middlewares/verify.token.js';

const router = express.Router();

router.get('/me', verifyToken, getUserWithToken);
router.post('/register', validateData(userValidation), registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post(
  '/reset-password',
  validateData(updatePasswordValidation),
  resetPassword
);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

export default router;
