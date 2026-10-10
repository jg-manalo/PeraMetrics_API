import {
  storeExpense,
  storeIncome,
  storeTransfer,
  removeTransaction,
  fetchTransactions,
  generateReport,
  editTransaction,
} from '../services/transaction.service.js';
import { reportResource } from '../resources/reports.resource.js';
import { TransactionReportResource } from '../types/resources.js';
import { APIResponse } from '../types/api.js';
import { BadRequestError } from '../errors/errors.js';
import type { Transaction } from '../types/transaction.js';
import type { NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/api.js';
import type {
  MoneyInOutPayload,
  TransactionTransferPayload,
} from '../types/transaction.js';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { TransactionQuery } from '../types/queries.js';
import type { PaginatedData } from '../types/api.js';

type TransactionRequest<TParams extends ParamsDictionary> =
  AuthenticatedRequest<
    TParams,
    Pick<
      Transaction,
      | 'name'
      | 'amount'
      | 'moneySource'
      | 'uid'
      | 'transferDestination'
      | 'date'
      | 'category'
    >,
    TransactionQuery
  >;

export const getTransactions = async (
  req: TransactionRequest<{}>,
  res: APIResponse<PaginatedData<Partial<Transaction>>>,
  next: NextFunction
): Promise<void> => {
  try {
    const userUid = req.user.userUid;

    const filters: TransactionQuery = req.query;
    const transactions = await fetchTransactions(userUid, filters);

    res.status(200).json({
      message: 'Transactions fetched successfully',
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const generatePeriodicReport = async (
  req: TransactionRequest<{}>,
  res: APIResponse<TransactionReportResource>,
  next: NextFunction
): Promise<void> => {
  try {
    const userUid = req.user.userUid;

    const { to, from }: TransactionQuery = req.query;

    if (!to || !from) {
      throw new BadRequestError('Start date and end date are required');
    }

    const report = await generateReport(userUid, from, to);

    res.status(200).json({
      message: 'Timely report generated successfully',
      data: reportResource(report),
    });
  } catch (error) {
    next(error);
  }
};

export const transactIncome = async (
  req: TransactionRequest<{}>,
  res: APIResponse<MoneyInOutPayload>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, amount, moneySource } = req.body;

    const userUid = req.user.userUid;

    const newIncome = await storeIncome(userUid, name, amount, moneySource);

    res.status(201).json({
      message: 'Income transaction created successfully',
      data: newIncome,
    });
  } catch (error) {
    next(error);
  }
};

export const transactExpense = async (
  req: TransactionRequest<{}>,
  res: APIResponse<MoneyInOutPayload>,
  next: NextFunction
): Promise<void> => {
  try {
    const userUid = req.user.userUid;
    const { name, amount, moneySource } = req.body;

    const newExpense = await storeExpense(userUid, name, amount, moneySource);

    res.status(201).json({
      message: 'Expense transaction created successfully',
      data: newExpense,
    });
  } catch (error) {
    next(error);
  }
};

export const transactTransfer = async (
  req: TransactionRequest<{ uid: string }>,
  res: APIResponse<TransactionTransferPayload>,
  next: NextFunction
): Promise<void> => {
  try {
    const userUid = req.user.userUid;
    const { name, amount, moneySource, transferDestination } = req.body;

    const newTransfer: TransactionTransferPayload = await storeTransfer(
      userUid,
      name,
      amount,
      moneySource,
      transferDestination
    );

    res.status(201).json({
      message: 'Transfer transaction created successfully',
      data: newTransfer,
    });
  } catch (error) {
    next(error);
  }
};

export const modifyTransaction = async (
  req: TransactionRequest<{ uid: string }>,
  res: APIResponse<void>,
  next: NextFunction
) => {
  try {
    const userUid = req.user.userUid;
    const { uid } = req.params;
    const {
      name,
      date,
      amount,
      moneySource: from,
      transferDestination: to,
      category,
    } = req.body;

    await editTransaction({
      userUid,
      transactionUid: uid,
      name,
      date,
      amount,
      from,
      to,
      category,
    });

    res.status(200).json({
      message: 'Transaction modified successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (
  req: TransactionRequest<{ uid: string }>,
  res: APIResponse<void>,
  next: NextFunction
): Promise<void> => {
  try {
    const { uid } = req.params;
    const userUid = req.user.userUid;

    await removeTransaction(userUid, uid);

    res.status(200).json({
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
