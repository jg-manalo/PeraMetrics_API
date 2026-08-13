import {
  deleteUser,
  getUserByUuid,
  updateUser,
} from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/verify.token.js';
import { checkAuthorizationForUserCredentials } from '../middlewares/check.authorization.js';
import express from 'express';

const router = express.Router();

router.get(
  '/:uid',
  verifyToken,
  checkAuthorizationForUserCredentials,
  getUserByUuid,
);
router.put(
  '/:uid',
  verifyToken,
  checkAuthorizationForUserCredentials,
  updateUser,
);
router.delete(
  '/:uid',
  verifyToken,
  checkAuthorizationForUserCredentials,
  deleteUser,
);

export default router;
