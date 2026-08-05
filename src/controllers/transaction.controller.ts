import type {Transaction} from '../types/transaction';
import type {NextFunction} from 'express';
import {storeExpense, storeIncome, storeTransfer, removeTransaction, fetchTransactions, generateReport} from '../services/transaction.service';
import {transactionValidation} from '../validations/transaction.validation';
import {formatValidationError} from '../validations/format';
import {MoneySource} from '../types/moneysource';
import {reportResource} from '../resources/reports.resource';
import {TransactionReportResource} from '../types/resources';
import {APIResponse} from '../types/api';
import type {AuthenticatedRequest} from '../types/api';
import type {ParamsDictionary} from 'express-serve-static-core';
import type {TransactionQuery} from '../types/queries';
import {NotFoundError} from '../errors/errors';
import logger from '../config/logger';


//TODO: Refactor validation to a centralized validation middleware to avoid code duplication and improve maintainability.
type TransactionRequest<TParams extends ParamsDictionary> = AuthenticatedRequest<TParams, Pick<Transaction, 'name' | 'amount' | 'moneySource' | 'uid' | 'transferDestination'>, TransactionQuery>;

type MoneyInOutPayload = {
    transaction: Partial<Transaction> | undefined;
    updatedMoneySource: Partial<MoneySource> | undefined;
}

type TransferPayload = MoneyInOutPayload & {
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
        next(error);
    }
}

export const generatePeriodicReport = async (req: TransactionRequest<{}>, res: APIResponse<TransactionReportResource>, next: NextFunction): Promise<void> => {
    try {
        const userUid = req.user.userUid;

        const {to, from} : TransactionQuery = req.query;

        if (!to || !from) {
            throw new NotFoundError("Start date and end date are required");
        }

        const report = await generateReport(userUid, from, to);

        res.status(200).json({
            message: "Timely report generated successfully",
            data: reportResource(report)
        });

    } catch (error) {
        next(error);
    }
}

export const transactIncome = async (req: TransactionRequest<{}>, res: APIResponse<MoneyInOutPayload>, next: NextFunction): Promise<void> => {
    try{
        const validateTransaction = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            res.status(400).json({
                message: 'Validation failed',
                errors: formatValidationError(validateTransaction.error)
            });
            return;
        }
        const {name, amount, moneySource} = req.body;

        const userUid = req.user.userUid;


        const newIncome: MoneyInOutPayload = await storeIncome(userUid, name, amount, moneySource);

        res.status(201).json({
            message: 'Income transaction created successfully',
            data: newIncome
        });
    } catch (error) {

        logger.error(`Error creating income transaction: ${error}`);

        next(error);
    }
}

export const transactExpense = async (req: TransactionRequest<{}>, res: APIResponse<MoneyInOutPayload>, next: NextFunction): Promise<void> => {
    try{
        const userUid = req.user.userUid;
        const {name, amount, moneySource} = req.body;

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
        next(error);
    }
}

export const transactTransfer = async (req: TransactionRequest<{}>, res: APIResponse<TransferPayload>, next: NextFunction): Promise<void> => {
    try{
        const userUid  = req.user.userUid;
        const {name, amount, moneySource, transferDestination} = req.body;

        const validateTransaction = transactionValidation.safeParse(req.body);

        if(!validateTransaction.success){
            res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateTransaction.error)
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
        next(error);
    }
}

export const deleteTransaction = async (req: TransactionRequest<{uid: string}>, res: APIResponse<void>, next: NextFunction): Promise<void> => {
    try{
        const {uid} = req.params;
        const userUid = req.user.userUid;

        await removeTransaction(userUid, uid);

        res.status(200).json({
            message: "Transaction deleted successfully",
        });


    } catch (error) {
        logger.error(`Error deleting transaction: ${error}`);
        next(error);
    }
}
