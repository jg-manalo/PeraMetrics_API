import {
  generateMoneySource,
  editMoneySourceName,
  removeMoneySource,
} from '../services/moneysource.service.js';
import type { NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/api.js';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { APIResponse } from '../types/api.js';
import type { APIPaginatedResponse } from '../types/api.js';
import type { MoneySource } from '../types/moneysource.js';
import type { ParsedQs } from 'qs';
import { getMoneySourcesFromUser } from '../services/moneysource.service.js';
import { bulkDeleteMoneySources } from '../services/moneysource.service.js';
import { NotFoundError } from '../errors/errors.js';

type MoneySourceQuery = ParsedQs & {
  orderBy: string;
  direction: 'asc' | 'desc';
  entity: string | '';
  page: number;
};

type MoneySourceRequest<TParams extends ParamsDictionary> =
  AuthenticatedRequest<
    TParams,
    { name?: string; initialAmount?: string; uids?: string[] },
    {}
  >;

type MoneySourceGetRequest<TParams extends ParamsDictionary> =
  AuthenticatedRequest<TParams, {}, MoneySourceQuery>;

export const getAllMoneySources = async (
  req: MoneySourceGetRequest<{}>,
  res: APIPaginatedResponse<MoneySource>,
  next: NextFunction
): Promise<void> => {
  try {
    const userUid = req.user.userUid;

    const filters: MoneySourceQuery = req.query;

    const moneySources = await getMoneySourcesFromUser(userUid, filters);
    const currentPage = Number(filters.page) || 1;
    res.status(200).json({
      message: 'Money sources fetched successfully',
      totalPages: moneySources.totalPages,
      previousPage: moneySources.canPreviousPage
        ? `${process.env.SERVER_URL}/api/moneysources?page=${currentPage - 1}`
        : null,
      nextPage: moneySources.canNextPage
        ? `${process.env.SERVER_URL}/api/moneysources?page=${currentPage + 1}`
        : null,
      data: moneySources.data,
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

    if (!name) {
      throw new NotFoundError('No name provided for money source creation');
    }

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

    if (!name) {
      throw new NotFoundError('No name provided for money source update');
    }

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

export const multiDeleteMoneySources = async (
  req: MoneySourceRequest<{}>,
  res: APIResponse<Partial<MoneySource> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const { uids } = req.body;
    const userUid = req.user.userUid;

    if (!uids) {
      throw new NotFoundError('No money source uids provided for deletion');
    }
    await bulkDeleteMoneySources(uids, userUid);

    res.status(200).json({
      message: 'Multiple money sources deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
