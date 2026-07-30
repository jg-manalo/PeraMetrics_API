import {createMoneySource, deleteMoneySource, editMoneySource} from '../controllers/moneysource.controller'
import {verifyToken} from '../middlewares/verify.token'
import express from 'express';
import type {Router} from 'express';

const router: Router = express.Router();

router.post('/', verifyToken, createMoneySource);
router.put('/:uid', verifyToken, editMoneySource);
router.delete('/:uid', verifyToken, deleteMoneySource);

export default router;
