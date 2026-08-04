import type {Transaction} from '../types/transaction';
import type {NextFunction} from 'express';
import {storeExpense, storeIncome, storeTransfer, removeTransaction, fetchTransactions, generateReport} from '../services/transaction.service';
import {transactionValidation} from '../validations/transaction.validation';
import {formatValidationError} from '../validations/format';
import { MoneySource } from '../types/moneysource';
import {reportResource} from '../resources/reports.resource';
import { TransactionReportResource } from '../types/resources';
import {APIResponse} from '../types/api';
import type {AuthenticatedRequest} from '../types/api';
import type {ParamsDictionary} from 'express-serve-static-core';
import logger from '../config/logger';

// FIXME: create a custom specific error handler for the controller to avoid repeating the same error handling logic in every controller function 

type TransactionQuery = {
    page?: number;
    orderBy? : 'asc' | 'desc';
    category?: Transaction['category'];
    from?: string;
    to?: string;
}

type TransactionRequest<TParams extends ParamsDictionary> = AuthenticatedRequest<TParams, Pick<Transaction, 'name' | 'amount' | 'moneySource' | 'uid' | 'transferDestination'>, TransactionQuery>;

interface MoneyInOutPayload {
    transaction: Partial<Transaction> | undefined;
    updatedMoneySource: Partial<MoneySource> | undefined;
}

interface TransferPayload extends MoneyInOutPayload {
    updatedDestinationMoneySource: Partial<MoneySource> | undefined;
}

export const getTransactions = async (req: TransactionRequest<{}>, res: APIResponse<Transaction[]>, next: NextFunction): Promise<void> => {
    try{
        const userUid = req.user.userUid;

        const filters: TransactionQuery = req.query;
        const transactions = await fetchTransactions(userUid, filters);

        res.status(200).json({
            message: "Transactions fetched successfully",
            data: transactions
        });
        
    }catch (error) {
        logger.error(`Error fetching transactions: ${error}`);
       
        if (error instanceof Error && error.message === 'No transactions history found') {
            res.status(404).json({
                message: error.message
            });

            return;
        }

        if (error instanceof Error ){
            res.status(500).json({
                message: error.message
            });

            return;
        }
        next(error);
    }
}

export const generatePeriodicReport = async (req: TransactionRequest<{}>, res: APIResponse<TransactionReportResource>, next: NextFunction): Promise<void> => {
    try {
       const userUid = req.user.userUid;

       const {to, from} : TransactionQuery = req.query;

        if (!to || !from) {
            res.status(400).json({
                message: "Start date and end date are required"
            });
            return;
        }

        const report = await generateReport(userUid, from, to);

        res.status(200).json({
            message: "Timely report generated successfully",
            data: reportResource(report)
        });

    } catch (error) {
        logger.error(`Error generating timely report: ${error}`);

        if (error instanceof Error && error.message === 'No transactions found for the specified period') {
            res.status(404).json({
                message: error.message
            });
            return;
        }

        next(error);
    }
}

export const transactIncome = async (req: TransactionRequest<{}>, res: APIResponse<MoneyInOutPayload>, next: NextFunction): Promise<void> => {
    try{
        const {name, amount, moneySource}: { name: string, amount: string, moneySource: string } = req.body;

        const userUid: string | undefined = req.user?.userUid;

        const validateTransaction = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
            });
            return;
        }

        const newIncome: MoneyInOutPayload = await storeIncome(userUid, name, amount, moneySource);

        res.status(201).json({
            message: "Income transaction created successfully",
            data: newIncome
        });
    } catch (error) {

        logger.error(`Error creating income transaction: ${error}`);

        if (error instanceof Error && error.message === 'Money source not found') {
            res.status(404).json({
                message: error.message
            });

            return;
        } else if (error instanceof Error && error.message === 'Failed to update money source balance') {
            res.status(500).json({
                message: error.message
            });

            return;
        }

        next(error);
    }
}

export const transactExpense = async (req: TransactionRequest<{}>, res: APIResponse<MoneyInOutPayload>, next: NextFunction): Promise<void> => {
    try{
        const userUid: string | undefined = req.user?.userUid;
        const {name, amount, moneySource}: { name: string, amount: string, moneySource: string } = req.body;

        const validateTransaction = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
            });

            return;
        }

        const newExpense: MoneyInOutPayload = await storeExpense(userUid, name, amount, moneySource);

        res.status(201).json({
            message: "Expense transaction created successfully",
            data: newExpense
        });
    }catch (error) {
        logger.error(`Error creating expense transaction: ${error}`);

        if (error instanceof Error && error.message === 'Money source not found') {
            res.status(404).json({
                message: error.message
            });
            return;
        }

        if (error instanceof Error && error.message === 'Insufficient funds in the money source') {
            res.status(400).json({
                message: error.message
            });
            return;
        }
        next(error);
    }
}

export const transactTransfer = async (req: TransactionRequest<{}>, res: APIResponse<TransferPayload>, next: NextFunction): Promise<void> => {
    try{
        const userUid  = req.user?.userUid;
        const {name, amount, moneySource, transferDestination} = req.body;

        const validateTransaction = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
            });
            return;
        }

        if (!transferDestination) {
            res.status(400).json({
                message: "Transfer destination is required"
            });
            return;
        }
        const newTransfer: TransferPayload = await storeTransfer(userUid, name, amount, moneySource, transferDestination);

        res.status(201).json({
            message: "Transfer transaction created successfully",
            data: newTransfer
        });
        
    } catch (error) {
        logger.error(`Error creating transfer transaction: ${error}`);

        if (error instanceof Error && error.message === 'Money source not found') {
            res.status(404).json({
                message: error.message
            });
            return;
        }

        if (error instanceof Error && error.message === 'Insufficient funds in the origin money source') {
            res.status(400).json({
                message: error.message
            });
            return;
        }

        next(error);
    }
}

export const deleteTransaction = async (req: TransactionRequest<{uid: string}>, res: APIResponse<void>, next: NextFunction): Promise<void> => {
    try{
        const {uid} = req.params;
        const userUid = req.user.userUid;

        const deletedTransaction = await removeTransaction(userUid, uid);

        res.status(200).json({
            message: "Transaction deleted successfully",
            data: deletedTransaction
        });


    } catch (error) {
        logger.error(`Error deleting transaction: ${error}`);

        if (error instanceof Error && error.message === 'Transaction not found') {
            res.status(404).json({
                message: error.message
            });

            return;
        }

        next(error);
    }
}
