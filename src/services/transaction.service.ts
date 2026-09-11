import { db } from '../config/database.js';
import { transactions } from '../models/transactions.js';
import { eq, and, AnyColumn } from 'drizzle-orm';
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
import logger from '../config/logger.js';
import { MoneySource } from '../types/moneysource.js';

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
): Promise<Transaction[]> => {
  try {
    const page: number = filters.page ?? 1;
    const pageLimit: number = 5;
    const offset: number = (page - 1) * pageLimit;
    const categoryFilter: Transaction['category'] | undefined =
      filters.category;

    // FIXME: iba yung handling sa to and from since sa uid magbabase pag directly sa column instead sa relationship. Mahirap pala
    // TODO: refactor this to use a utility function for pagination and sorting
    const sortableColumns = {
      name: 'name',
      amount: 'amount',
      date: 'date',
      category: 'category',
      moneySource: 'moneySource',
      transferDestination: 'transferDestination',
    } as const;

    const sortableColumnsFromRelationships = {
      to: 'name',
      source: 'name',
    } as const;

    type SortableColumn = keyof typeof sortableColumns;
    type SortableColumnFromRelationships =
      keyof typeof sortableColumnsFromRelationships;

    const isSortableColumnFromRelationships = (
      value: string
    ): value is SortableColumnFromRelationships =>
      value in sortableColumnsFromRelationships;

    const isSortableColumn = (value: string): value is SortableColumn =>
      value in sortableColumns;

    const selectedColumn = isSortableColumn(filters.orderBy)
      ? sortableColumns[filters.orderBy]
      : 'date';

    const selectedColumnFromRelationships = isSortableColumnFromRelationships(
      filters.orderBy
    )
      ? sortableColumnsFromRelationships[filters.orderBy]
      : selectedColumn;

    console.log('selectedColumn:', selectedColumnFromRelationships);
    const results = await db.query.transactions.findMany({
      where: {
        user: userUid,
        category: categoryFilter ? categoryFilter : undefined,
      },
      orderBy: {
        [selectedColumn]: filters.direction === 'asc' ? 'asc' : 'desc',
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
      limit: pageLimit,
      offset: offset,
    });

    return results;
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
