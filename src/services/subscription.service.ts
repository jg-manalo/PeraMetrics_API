import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../config/database.js';
import logger from '../config/logger.js';
import {
  DuplicateError,
  ForbiddenError,
  NotFoundError,
  ValueError,
} from '../errors/errors.js';
import { subscriptions } from '../models/subscriptions.js';
import type { PaginatedData } from '../types/api.js';
import type { Subscription } from '../types/subscriptions.js';
import type { DataQuery } from '../types/queries.js';
import { pagination, paginationResult } from '../utils/pagination.js';
import { getMoneySourceByUuid } from './moneysource.service.js';
import { moneySources } from '../models/moneysources.js';
import { asc, desc, ilike } from 'drizzle-orm';
import { sortColumnsViaSQLJoin } from '../utils/sortcolumns.js';

type SubscriptionInput = Pick<
  Subscription,
  'name' | 'amount' | 'duration' | 'moneySource'
> & {
  startDate: string | Date;
};

const subscriptionFields = {
  id: subscriptions.id,
  uid: subscriptions.uid,
  name: subscriptions.name,
  user: subscriptions.user,
  startDate: subscriptions.startDate,
  amount: subscriptions.amount,
  duration: subscriptions.duration,
  moneySource: subscriptions.moneySource,
  createdAt: subscriptions.createdAt,
  updatedAt: subscriptions.updatedAt,
};

export const getSubscriptionsFromUser = async (
  userUid: string,
  filters: DataQuery
): Promise<PaginatedData<Partial<Subscription>>> => {
  try {
    const { pageLimit, offset } = pagination(filters.page);
    const orderFn = filters.direction === 'asc' ? asc : desc;

    const sortableColumns = {
      name: subscriptions.name,
      amount: subscriptions.amount,
      startDate: subscriptions.startDate,
      duration: subscriptions.duration,
      moneySource: moneySources.name,
    } as const;

    const selectedColumn = sortColumnsViaSQLJoin(
      sortableColumns,
      filters,
      subscriptions.createdAt
    );

    if (!selectedColumn) {
      throw new ValueError(`Invalid sort column: ${selectedColumn}`);
    }

    const whereCondition = filters.entity
      ? and(
          eq(subscriptions.user, userUid),
          ilike(subscriptions.name, `%${filters.entity}%`)
        )
      : eq(subscriptions.user, userUid);

    const [count, subscriptionHistory] = await Promise.all([
      db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(whereCondition),

      db
        .select({
          uid: subscriptions.uid,
          name: subscriptions.name,
          amount: subscriptions.amount,
          startDate: subscriptions.startDate,
          duration: subscriptions.duration,
          moneySource: moneySources.name,
          moneySourceUid: subscriptions.moneySource,
        })
        .from(subscriptions)
        .leftJoin(moneySources, eq(subscriptions.moneySource, moneySources.uid))
        .where(whereCondition)
        .orderBy(orderFn(selectedColumn), orderFn(subscriptions.id))
        .limit(pageLimit)
        .offset(offset),
    ]);

    return paginationResult(
      count.length,
      subscriptionHistory,
      pageLimit,
      offset,
      filters.page
    );
  } catch (error) {
    logger.error(`Error fetching subscriptions: ${error}`);
    throw error;
  }
};

export const generateSubscription = async (
  input: SubscriptionInput,
  userUid: string
): Promise<Partial<Subscription> | undefined> => {
  try {
    const moneySource = await getMoneySourceByUuid(input.moneySource);

    const unauthorizedUser = moneySource.user !== userUid;

    if (unauthorizedUser) {
      throw new ForbiddenError(
        'You are not authorized to edit this money source'
      );
    }
    const name = input.name.trim().toUpperCase();

    if (await isExistingSubscriptionName(name, userUid)) {
      throw new DuplicateError('Subscription with this name already exists');
    }

    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        name,
        user: userUid,
        startDate: new Date(input.startDate),
        amount: input.amount,
        duration: input.duration,
        moneySource: input.moneySource,
      })
      .returning(subscriptionFields);

    return newSubscription as Partial<Subscription>;
  } catch (error) {
    logger.error(`Error generating subscription: ${error}`);
    throw error;
  }
};

export const editSubscription = async (
  uid: string,
  input: SubscriptionInput,
  userUid: string
): Promise<Partial<Subscription> | undefined> => {
  try {
    const existingSubscription = await getSubscriptionByUuid(uid);

    if (existingSubscription.user !== userUid) {
      throw new ForbiddenError(
        'You are not authorized to edit this subscription'
      );
    }

    const moneySource = await getMoneySourceByUuid(input.moneySource);

    const unauthorizedUser = moneySource.user !== userUid;

    if (unauthorizedUser) {
      throw new ForbiddenError(
        'You are not authorized to edit this money source'
      );
    }

    const name = input.name.trim().toUpperCase();

    if (await isExistingSubscriptionName(name, userUid, uid)) {
      throw new DuplicateError('Subscription with this name already exists');
    }

    const [updatedSubscription] = await db
      .update(subscriptions)
      .set({
        name,
        startDate: new Date(input.startDate),
        amount: input.amount,
        duration: input.duration,
        moneySource: input.moneySource,
        updatedAt: new Date(),
      })
      .where(and(eq(subscriptions.uid, uid), eq(subscriptions.user, userUid)))
      .returning(subscriptionFields);

    return updatedSubscription;
  } catch (error) {
    logger.error(`Error editing subscription: ${error}`);
    throw error;
  }
};

export const removeSubscription = async (
  uid: string,
  userUid: string
): Promise<Partial<Subscription> | undefined> => {
  try {
    const subscription = await getSubscriptionByUuid(uid);

    if (subscription.user !== userUid) {
      throw new ForbiddenError(
        'You are not authorized to delete this subscription'
      );
    }

    const [deletedSubscription] = await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.uid, uid), eq(subscriptions.user, userUid)))
      .returning({
        uid: subscriptions.uid,
        name: subscriptions.name,
        user: subscriptions.user,
      });

    return deletedSubscription;
  } catch (error) {
    logger.error(`Error removing subscription: ${error}`);
    throw error;
  }
};

export const bulkDeleteSubscriptions = async (
  uids: string[],
  userUid: string
): Promise<void> => {
  try {
    if (uids.length === 0) {
      throw new ValueError('No subscription UIDs provided for deletion');
    }

    await db
      .delete(subscriptions)
      .where(
        and(eq(subscriptions.user, userUid), inArray(subscriptions.uid, uids))
      );
  } catch (error) {
    logger.error(`Error bulk deleting subscriptions: ${error}`);
    throw error;
  }
};

const getSubscriptionByUuid = async (uid: string) => {
  const subscription = await db.query.subscriptions.findFirst({
    where: { uid },
  });

  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  return subscription;
};

const isExistingSubscriptionName = async (
  name: string,
  userUid: string,
  excludedUid?: string
): Promise<boolean> => {
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: {
      name,
      user: userUid,
      uid: excludedUid ? { ne: excludedUid } : undefined,
    },
  });

  return Boolean(existingSubscription);
};
