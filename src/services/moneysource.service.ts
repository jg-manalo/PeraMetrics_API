import type { User } from '../types/user.js';
import type { MoneySource } from '../types/moneysource.js';
import type { DatabaseTransaction } from '../types/databasetransaction.js';
import { db } from '../config/database.js';
import { eq, and } from 'drizzle-orm';
import { moneySources } from '../models/moneysources.js';
import type { DataQuery } from '../types/queries.js';
import { pagination } from '../utils/pagination.js';
import { sortColumns } from '../utils/sortcolumns.js';

import {
  NotFoundError,
  DuplicateError,
  ForbiddenError,
  ValueError,
} from '../errors/errors.js';
import logger from '../config/logger.js';

export const getMoneySourcesFromUser = async (
  userUid: string,
  filters: DataQuery
) => {
  try {
    const { pageLimit, offset } = pagination(filters.page);

    const sortableColumns = {
      name: 'name',
      amount: 'amount',
      createdAt: 'createdAt',
    } as const;

    console.log('filters entity:', filters.entity);
    const selectedColumn = sortColumns(sortableColumns, filters, 'createdAt');
    const sources = await db.query.moneySources.findMany({
      where: {
        user: userUid,
        name: filters.entity ? { like: `%${filters.entity}%` } : undefined,
      },
      orderBy: {
        [selectedColumn]: filters.direction === 'asc' ? 'asc' : 'desc',
      },
      limit: pageLimit,
      offset: offset,
    });
    return sources;
  } catch (error) {
    logger.error(`Error fetching money sources: ${error}`);
    throw error;
  }
};
export const generateMoneySource = async (
  name: string,
  userUid: User['uid'],
  initialAmount?: string
): Promise<Partial<MoneySource> | undefined> => {
  try {
    const sourceName = name.trim().toUpperCase();

    const existingSource: MoneySource | undefined =
      await db.query.moneySources.findFirst({
        where: {
          name: sourceName,
          user: userUid,
        },
      });

    if (existingSource) {
      throw new DuplicateError('Money source with this name already exists');
    }

    if (initialAmount && parseFloat(initialAmount) < 0) {
      throw new ValueError('Initial amount cannot be negative');
    }

    const [newSource]: Partial<MoneySource>[] = await db
      .insert(moneySources)
      .values({
        name: sourceName,
        user: userUid,
        amount: initialAmount ? initialAmount : '0.00',
      })
      .returning({
        id: moneySources.id,
        uid: moneySources.uid,
        user: moneySources.user,
        name: moneySources.name,
        amount: moneySources.amount,
      });

    return newSource;
  } catch (error) {
    logger.error(`Error generating money source: ${error}`);
    throw error;
  }
};

export const getMoneySourceByUuid = async (uid: string | null) => {
  try {
    if (!uid) {
      throw new NotFoundError('uid is required to find money source');
    }
    const moneySource = await db.query.moneySources.findFirst({
      where: {
        uid: uid,
      },
    });

    if (!moneySource) {
      throw new NotFoundError('Money source not found');
    }

    return moneySource;
  } catch (error) {
    logger.error(`Error finding money source: ${error}`);
    throw error;
  }
};

export const editMoneySourceName = async (
  uid: string,
  newName: string,
  userUid: User['uid']
): Promise<Partial<MoneySource> | undefined> => {
  try {
    const sourceName = newName.trim().toUpperCase();

    const moneySource = await getMoneySourceByUuid(uid);

    const unauthorizedUser = moneySource.user !== userUid;

    if (unauthorizedUser) {
      throw new ForbiddenError(
        'You are not authorized to edit this money source'
      );
    }

    // problem only checks that source name not the whole table

    if (await isExistingMoneySourceName(sourceName)) {
      throw new DuplicateError('Money source with this name already exists');
    }

    const [updatedSource]: Partial<MoneySource>[] = await db
      .update(moneySources)
      .set({
        name: sourceName,
        updatedAt: new Date(),
      })
      .where(and(eq(moneySources.uid, uid), eq(moneySources.user, userUid)))
      .returning({
        name: moneySources.name,
        uid: moneySources.uid,
        user: moneySources.user,
      });

    return updatedSource;
  } catch (error) {
    logger.error(`Error editing money source name: ${error}`);
    throw error;
  }
};

export const removeMoneySource = async (
  uid: string,
  userUid: User['uid']
): Promise<Partial<MoneySource> | undefined> => {
  try {
    const moneySourceToBeDeleted = await getMoneySourceByUuid(uid);

    if (moneySourceToBeDeleted.user !== userUid) {
      throw new ForbiddenError(
        'You are not authorized to delete this money source'
      );
    }

    const [deletedSource]: Partial<MoneySource>[] = await db
      .delete(moneySources)
      .where(and(eq(moneySources.uid, uid), eq(moneySources.user, userUid)))
      .returning({
        name: moneySources.name,
        uid: moneySources.uid,
        user: moneySources.user,
      });

    return deletedSource;
  } catch (error) {
    logger.error(`Error removing money source: ${error}`);
    throw error;
  }
};

export const updateMoneySourceBalance = async (
  tx: DatabaseTransaction,
  userUid: string,
  moneySource: string | null,
  amount: string,
  operation: 'add' | 'subtract'
): Promise<Partial<MoneySource> | undefined> => {
  try {
    if (!moneySource) {
      throw new NotFoundError('Money source not found');
    }
    const source = await getMoneySourceByUuid(moneySource);

    let totalAmount: number;

    switch (operation) {
      case 'add':
        totalAmount = parseFloat(source.amount) + parseFloat(amount);
        break;
      case 'subtract':
        totalAmount = parseFloat(source.amount) - parseFloat(amount);
        break;
      default:
        throw new Error('Invalid operation');
    }

    const [updatedMoneySource] = await tx
      .update(moneySources)
      .set({
        amount: totalAmount.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(moneySources.uid, moneySource), eq(moneySources.user, userUid))
      )
      .returning({
        name: moneySources.name,
        amount: moneySources.amount,
      });

    return updatedMoneySource;
  } catch (error) {
    logger.error(`Error updating money source balance: ${error}`);
    throw error;
  }
};

const isExistingMoneySourceName = async (name: string): Promise<boolean> => {
  const existingSource = await db.query.moneySources.findFirst({
    where: {
      name: name.trim().toUpperCase(),
    },
  });

  return Boolean(existingSource);
};
