import type { Transaction } from '../types/transaction';
import type {Request, Response, NextFunction} from 'express';
import type { ZodSafeParseResult } from 'zod';
import {storeExpense, storeIncome, storeTransfer, removeTransaction} from '../services/transaction.service';
import {transactionValidation} from '../validations/transaction.validation';
import { formatValidationError } from '../validations/format';
import logger from '../config/logger';
import { MoneySource } from '../types/moneysource';

type TransactionRequest = Request<Pick<Transaction, 'name' | 'amount' | 'moneySource' | 'uid'>> & {user?: {userUid?: string }};

interface MoneyInOutPayload {
    transaction: Partial<Transaction> | undefined;
    updatedMoneySource: Partial<MoneySource> | undefined;
}


interface TransferPayload extends MoneyInOutPayload {
    updatedDestinationMoneySource: Partial<MoneySource> | undefined;
}

export const transactIncome = async (req: TransactionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {name, amount, moneySource}: { name: string, amount: string, moneySource: string } = req.body;

        const userUid: string | undefined = req.user?.userUid;

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        const validateTransaction: ZodSafeParseResult<Partial<Transaction>> = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
            });
        }

        const newIncome: MoneyInOutPayload = await storeIncome(userUid, name, amount, moneySource);

        return res.status(201).json({
            message: "Income transaction created successfully",
            data: newIncome
        });
    } catch (error) {

        logger.error(`Error creating income transaction: ${error}`);

        if (error instanceof Error && error.message === 'Money source not found') {
            return res.status(404).json({
                message: error.message
            });
        } else if (error instanceof Error && error.message === 'Failed to update money source balance') {
            return res.status(500).json({
                message: error.message
            });
        }

        next(error);
    }
}

export const transactExpense = async (req: TransactionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const userUid: string | undefined = req.user?.userUid;
        const {name, amount, moneySource}: { name: string, amount: string, moneySource: string } = req.body;

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        const validateTransaction: ZodSafeParseResult<Partial<Transaction>> = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
            });
        }

        const newExpense: MoneyInOutPayload = await storeExpense(userUid, name, amount, moneySource);

        return res.status(201).json({
            message: "Expense transaction created successfully",
            data: newExpense
        });
    }catch (error) {
        logger.error(`Error creating expense transaction: ${error}`);

        if (error instanceof Error && error.message === 'Money source not found') {
            return res.status(404).json({
                message: error.message
            });
        }

        if (error instanceof Error && error.message === 'Insufficient funds in the money source') {
            return res.status(400).json({
                message: error.message
            });
        }
        next(error);
    }
}

export const transactTransfer = async (req: TransactionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const userUid: string | undefined = req.user?.userUid;
        const {name, amount, moneySource, destinationMoneySource}: { name: string, amount: string, moneySource: string, destinationMoneySource: string } = req.body;

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        const validateTransaction: ZodSafeParseResult<Partial<Transaction>> = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
            });
        }

        const newTransfer: TransferPayload = await storeTransfer(userUid, name, amount, moneySource, destinationMoneySource);

        return res.status(201).json({
            message: "Transfer transaction created successfully",
            data: newTransfer
        });
        
    } catch (error) {
        logger.error(`Error creating transfer transaction: ${error}`);

        if (error instanceof Error && error.message === 'Money source not found') {
            return res.status(404).json({
                message: error.message
            });
        }

        if (error instanceof Error && error.message === 'Insufficient funds in the origin money source') {
            return res.status(400).json({
                message: error.message
            });
        }

        next(error);
    }
}

export const deleteTransaction = async (req: TransactionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {uid} : {uid: string}  = req.params;
        const userUid: string | undefined = req.user?.userUid;

        if (!uid) {
            return res.status(400).json({
                message: "Transaction UID is required"
            });
        }

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        const deletedTransaction = await removeTransaction(userUid, uid);


        return res.status(200).json({
            message: "Transaction deleted successfully",
            data: deletedTransaction
        });


    } catch (error) {
        logger.error(`Error deleting transaction: ${error}`);

        if (error instanceof Error && error.message === 'Transaction not found') {
            return res.status(404).json({
                message: error.message
            });
        }

        next(error);
    }
}