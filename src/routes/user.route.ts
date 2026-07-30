import express from 'express';
import {deleteUser, getUserByUuid, updateUser,} from '../controllers/user.controller';
import {verifyToken} from '../middlewares/verify.token';
import {checkAuthorizationForUserCredentials} from '../middlewares/check.authorization';

const router = express.Router();

router.get('/:uid', verifyToken, checkAuthorizationForUserCredentials, getUserByUuid);
router.put('/:uid', verifyToken, checkAuthorizationForUserCredentials, updateUser);
router.delete('/:uid', verifyToken, checkAuthorizationForUserCredentials, deleteUser);

export default router;