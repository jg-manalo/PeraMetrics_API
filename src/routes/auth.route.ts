import express from 'express';
import {registerUser, loginUser, requestPasswordReset, resetPassword} from '../controllers/auth.controller';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password/:tokenHash', resetPassword);

export default router;