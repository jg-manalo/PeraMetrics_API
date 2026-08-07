import {createMoneySource, deleteMoneySource, editMoneySource} from '../controllers/moneysource.controller'
import {verifyToken} from '../middlewares/verify.token'
import express from 'express';
import type {Router} from 'express';
import {validateData} from '../middlewares/validator';
import {moneySourceValidation} from '../validations/moneysource.validation';
const router: Router = express.Router();

router.post('/', verifyToken, validateData(moneySourceValidation), createMoneySource);
router.put('/:uid', verifyToken, validateData(moneySourceValidation), editMoneySource);
router.delete('/:uid', verifyToken, deleteMoneySource);

export default router;
