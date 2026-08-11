import express from 'express';
import {registerUser, loginUser, requestPasswordReset, resetPassword} from '../controllers/auth.controller';
import {validateData} from '../middlewares/validator';
import {userValidation} from '../validations/user.validation';
import {updatePasswordValidation} from '../validations/user.validation';
const router = express.Router();

router.post('/register',validateData(userValidation), registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password',validateData(updatePasswordValidation) ,resetPassword);

export default router;