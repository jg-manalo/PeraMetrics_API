import {
  deleteUser,
  getUserByUuid,
  updateUser,
} from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/verify.token.js';
import { checkAuthorizationForUserCredentials } from '../middlewares/check.authorization.js';
import express from 'express';
import { userUpdateValidation } from '../validations/user.validation.js';
import { validateData } from '../middlewares/validator.js';

const router = express.Router();

router.get(
  '/:uid',
  verifyToken,
  checkAuthorizationForUserCredentials,
  getUserByUuid
);
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
