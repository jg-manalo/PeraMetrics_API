import { db } from '../config/database.js';
import { transactions } from '../models/transactions.js';
import { eq, and, asc, desc } from 'drizzle-orm';
import {
  updateMoneySourceBalance,
  getMoneySourceByUuid,
} from './moneysource.service.js';
import { NotFoundError, ValueError } from '../errors/errors.js';
import type { Transaction } from '../types/transaction.js';
import type {
  MoneyInOutPayload,
  TransactionTransferPayload,
} from '../types/transaction.js';
import type { TransactionQuery } from '../types/queries.js';
import { MoneySource } from '../types/moneysource.js';
import logger from '../config/logger.js';
import { pagination, paginationResult } from '../utils/pagination.js';
import { sortColumnsViaSQLJoin } from '../utils/sortcolumns.js';
import { moneySources } from '../models/moneysources.js';
import { alias } from 'drizzle-orm/pg-core';
import { PaginatedData } from '../types/api.js';

type TransactionReport = Transaction & {
  source: {
    name: string;
  } | null;

  transferTo: {
    name: string;
  } | null;
};

export const fetchTransactions = async (
  userUid: string,
  filters: TransactionQuery
): Promise<PaginatedData<Partial<Transaction>>> => {
  try {
    const { pageLimit, offset } = pagination(filters.page);
    const originSource = alias(moneySources, 'from');
    const destinationSource = alias(moneySources, 'to');
    const orderFn = filters.direction === 'asc' ? asc : desc;

    const sortableColumns = {
      name: transactions.name,
      amount: transactions.amount,
      date: transactions.date,
      category: transactions.category,
      from: originSource.name,
      transferDestination: destinationSource.name,
    } as const;

    const selectedColumn = sortColumnsViaSQLJoin(
      sortableColumns,
      filters,
      transactions.date
    );

    if (!selectedColumn) {
      throw new ValueError(`Invalid sort column: ${selectedColumn}`);
    }

    const [count, txnHistory] = await Promise.all([
      db.query.transactions.findMany({
        where: {
          user: userUid,
        },
      }),
      db
        .select({
          uid: transactions.uid,
          date: transactions.date,
          name: transactions.name,
          from: originSource.name,
          from_uid: transactions.moneySource,
          to: destinationSource.name,
          to_uid: destinationSource.uid,
          category: transactions.category,
          amount: transactions.amount,
        })
        .from(transactions)
        .leftJoin(originSource, eq(transactions.moneySource, originSource.uid))
        .leftJoin(
          destinationSource,
          eq(transactions.transferDestination, destinationSource.uid)
        )
        .where(eq(transactions.user, userUid))
        .orderBy(orderFn(selectedColumn))
        .limit(pageLimit)
        .offset(offset),
    ]);
    return paginationResult(
      count.length,
      txnHistory,
      pageLimit,
      offset,
      filters.page
    );
  } catch (error) {
    logger.error(`Error fetching transactions: ${error}`);
    throw error;
  }
};

export const generateReport = async (
  userUid: string,
  startDate: string,
  endDate: string
): Promise<TransactionReport[]> => {
  try {
    const report = await db.query.transactions.findMany({
      where: {
        user: userUid,
        date: {
          gte: new Date(startDate).toISOString(),
          lte: new Date(endDate).toISOString(),
        },
      },
      orderBy: {
        date: 'desc',
      },
      with: {
        source: {
          columns: {
            name: true,
          },
        },
        transferTo: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (report.length === 0) {
      throw new NotFoundError('No transactions found for the specified period');
    }

    return report;
  } catch (error) {
    logger.error(`Error generating transaction report: ${error}`);
    throw error;
  }
};

export const storeIncome = async (
  userUid: string,
  name: string,
  amount: string,
  moneySource: string | null
): Promise<MoneyInOutPayload> => {
  try {
    const result = await db.transaction(async tx => {
      ensuresAmountIsPositive(amount);

      const updatedMoneySource = await updateMoneySourceBalance(
        tx,
        userUid,
        moneySource,
        amount,
        'add'
      );

      const [transaction]: Transaction[] = await tx
        .insert(transactions)
        .values({
          user: userUid,
          name: name,
          amount: amount,
          moneySource: moneySource,
          category: 'INCOME',
          date: new Date().toISOString(),
        })
        .returning({
          id: transactions.id,
          uid: transactions.uid,
          name: transactions.name,
          amount: transactions.amount,
          date: transactions.date,
          category: transactions.category,
          moneySource: transactions.moneySource,
        });
      return {
        transaction,
        updatedMoneySource,
      };
    });

    return result;
  } catch (error) {
    logger.error(`Error storing income: ${error}`);
    throw error;
  }
};

export const storeExpense = async (
  userUid: string,
  name: string,
  amount: string,
  moneySource: string | null
): Promise<MoneyInOutPayload> => {
  try {
    const result = await db.transaction(async tx => {
      const currentBalance = (await getMoneySourceByUuid(moneySource)).amount;

      ensuresAmountIsPositive(amount);
      ensuresItIsAfford(currentBalance, amount);

      const updatedMoneySource = await updateMoneySourceBalance(
        tx,
        userUid,
        moneySource,
        amount,
        'subtract'
      );

      const [transaction]: Transaction[] = await tx
        .insert(transactions)
        .values({
          user: userUid,
          name: name,
          amount: amount,
          moneySource: moneySource,
          category: 'EXPENSE',
          date: new Date().toISOString(),
        })
        .returning({
          id: transactions.id,
          uid: transactions.uid,
          name: transactions.name,
          amount: transactions.amount,
          date: transactions.date,
          category: transactions.category,
          moneySource: transactions.moneySource,
        });

      return {
        transaction,
        updatedMoneySource,
      };
    });

    return result;
  } catch (error) {
    logger.error(`Error storing expense: ${error}`);
    throw error;
  }
};

export const storeTransfer = async (
  userUid: string,
  name: string,
  amount: string,
  originMoneySource: string | null,
  destinationMoneySource: string | undefined | null
): Promise<TransactionTransferPayload> => {
  try {
    const result = await db.transaction(async tx => {
      const originBalance = (await getMoneySourceByUuid(originMoneySource))
        .amount;

      if (!destinationMoneySource) {
        throw new NotFoundError('Transfer destination not found');
      }

      const destinationBalance = (
        await getMoneySourceByUuid(destinationMoneySource)
      ).amount;

      let updatedMoneySource: Partial<MoneySource> | undefined;
      let updatedDestinationMoneySource: Partial<MoneySource> | undefined;

      if (originBalance && destinationBalance) {
        ensuresItIsAfford(originBalance, amount);
        ensuresAmountIsPositive(amount);

        updatedMoneySource = await updateMoneySourceBalance(
          tx,
          userUid,
          originMoneySource,
          amount,
          'subtract'
        );
        updatedDestinationMoneySource = await updateMoneySourceBalance(
          tx,
          userUid,
          destinationMoneySource,
          amount,
          'add'
        );
      }

      const [transaction]: Partial<Transaction>[] = await tx
        .insert(transactions)
        .values({
          user: userUid,
          name: name,
          amount: amount,
          moneySource: originMoneySource,
          transferDestination: destinationMoneySource,
          category: 'TRANSFER',
          date: new Date().toISOString(),
        })
        .returning({
          uid: transactions.uid,
          name: transactions.name,
          amount: transactions.amount,
          date: transactions.date,
          category: transactions.category,
          moneySource: transactions.moneySource,
          transferDestination: transactions.transferDestination,
        });

      return {
        transaction,
        updatedMoneySource,
        updatedDestinationMoneySource,
      };
    });

    return result;
  } catch (error) {
    logger.error(`Error storing transfer transaction: ${error}`);
    throw error;
  }
};

export const removeTransaction = async (
  userUid: string,
  transactionUid: string
): Promise<void> => {
  try {
    const result = await db.transaction(async tx => {
      const [existingTransaction] = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.uid, transactionUid),
            eq(transactions.user, userUid)
          )
        );

      if (!existingTransaction) {
        throw new NotFoundError('Transaction not found');
      }

      switch (existingTransaction.category) {
        case 'INCOME':
          if (existingTransaction.moneySource) {
            await updateMoneySourceBalance(
              tx,
              userUid,
              existingTransaction.moneySource,
              existingTransaction.amount,
              'subtract'
            );
          }
          await tx
            .delete(transactions)
            .where(
              and(
                eq(transactions.uid, transactionUid),
                eq(transactions.user, userUid)
              )
            );

          break;

        case 'EXPENSE':
          if (existingTransaction.moneySource) {
            await updateMoneySourceBalance(
              tx,
              userUid,
              existingTransaction.moneySource,
              existingTransaction.amount,
              'add'
            );
          }
          await tx
            .delete(transactions)
            .where(
              and(
                eq(transactions.uid, transactionUid),
                eq(transactions.user, userUid)
              )
            );

          break;

        case 'TRANSFER':
          if (existingTransaction.moneySource) {
            await updateMoneySourceBalance(
              tx,
              userUid,
              existingTransaction.moneySource,
              existingTransaction.amount,
              'add'
            );
          }
          if (existingTransaction.transferDestination) {
            await updateMoneySourceBalance(
              tx,
              userUid,
              existingTransaction.transferDestination,
              existingTransaction.amount,
              'subtract'
            );
          }
          await tx
            .delete(transactions)
            .where(
              and(
                eq(transactions.uid, transactionUid),
                eq(transactions.user, userUid)
              )
            );

          break;

        default:
          throw new NotFoundError('Unknown transaction category');
      }
    });

    return result;
  } catch (error) {
    logger.error(`Error removing transaction: ${error}`);
    throw error;
  }
};

const ensuresAmountIsPositive = (amount: string): void => {
  if (parseFloat(amount) <= 0) {
    throw new ValueError('Amount must be greater than zero');
  }
};

const ensuresItIsAfford = (currentBalance: string, amount: string): void => {
  if (parseFloat(currentBalance) < parseFloat(amount)) {
    throw new ValueError('Insufficient funds in the origin money source');
  }
};
