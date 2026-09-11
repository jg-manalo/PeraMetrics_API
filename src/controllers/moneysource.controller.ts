import {
  generateMoneySource,
  editMoneySourceName,
  removeMoneySource,
} from '../services/moneysource.service.js';
import type { NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/api.js';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { APIResponse } from '../types/api.js';
import type { MoneySource } from '../types/moneysource.js';
import type { ParsedQs } from 'qs';

// temporary
import { db } from '../config/database.js';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import { moneySources } from '../models/moneysources.js';
import type { AnyColumn } from 'drizzle-orm';

type MoneySourceQuery = ParsedQs & {
  orderBy: string;
  direction: 'asc' | 'desc';
  entity: string | '';
  page: number;
};

type MoneySourceRequest<TParams extends ParamsDictionary> =
  AuthenticatedRequest<TParams, { name: string; initialAmount?: string }, {}>;

type MoneySourceGetRequest<TParams extends ParamsDictionary> =
  AuthenticatedRequest<TParams, {}, MoneySourceQuery>;

const getMoneySourcesFromUser = async (
  userUid: string,
  query: MoneySourceQuery
) => {
  try {
    const pageLimit = 10;
    const page = query.page ? query.page : 1;
    const offset = (page - 1) * pageLimit;

    const columnMap: Record<string, AnyColumn> = {
      name: moneySources.name,
      amount: moneySources.amount,
      createdAt: moneySources.createdAt,
    };

    const sortColumn = columnMap[query.orderBy] || moneySources.createdAt;
    const orderFn = query.direction === 'asc' ? asc : desc;

    console.log('query.orderBy:', query.orderBy);
    console.log('query.direction:', query.direction);
    const sources = await db
      .select()
      .from(moneySources)
      .where(
        or(
          eq(moneySources.user, userUid),
          and(
            eq(moneySources.name, query.entity),
            eq(moneySources.user, userUid)
          )
        )
      )
      .orderBy(orderFn(sortColumn))
      .limit(pageLimit)
      .offset(offset);
    return sources;
  } catch (error) {
    console.error(error);
  }
};

export const getAllMoneySources = async (
  req: MoneySourceGetRequest<{}>,
  res: APIResponse<MoneySource[]>,
  next: NextFunction
) => {
  try {
    const userUid = req.user.userUid;

    const filters: MoneySourceQuery = req.query;
    console.log('req.query.queryParams:', filters);
    const moneySources = await getMoneySourcesFromUser(userUid, filters);

    res.status(200).json({
      message: 'Money sources fetched successfully',
      data: moneySources,
    });
  } catch (error) {
    next(error);
  }
};
export const createMoneySource = async (
  req: MoneySourceRequest<{}>,
  res: APIResponse<Partial<MoneySource> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, initialAmount } = req.body;
    const userUid = req.user?.userUid;

    const newSource = await generateMoneySource(name, userUid, initialAmount);

    res.status(201).json({
      message: 'Money source created successfully',
      data: newSource,
    });
  } catch (error) {
    next(error);
  }
};

export const editMoneySource = async (
  req: MoneySourceRequest<{ uid: string }>,
  res: APIResponse<Partial<MoneySource> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const { uid } = req.params;
    const { name } = req.body;
    const userUid = req.user.userUid;

    const updatedSource = await editMoneySourceName(uid, name, userUid);

    res.status(200).json({
      message: 'Money source updated successfully',
      data: updatedSource,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMoneySource = async (
  req: MoneySourceRequest<{ uid: string }>,
  res: APIResponse<Partial<MoneySource> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const { uid } = req.params;
    const userUid = req.user.userUid;

    const toDelete = await removeMoneySource(uid, userUid);

    res.status(200).json({
      message: 'Money source deleted successfully',
      data: toDelete,
    });
  } catch (error) {
    next(error);
  }
};
