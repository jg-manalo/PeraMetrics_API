import type { NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { APIResponse, APIPaginatedResponse } from '../types/api.js';
import type { AuthenticatedRequest } from '../types/api.js';
import type { Subscription } from '../types/subscriptions.js';
import type { DataQuery } from '../types/queries.js';
import {
  bulkDeleteSubscriptions,
  editSubscription as updateSubscription,
  generateSubscription,
  getSubscriptionsFromUser,
  removeSubscription,
} from '../services/subscription.service.js';
import { NotFoundError } from '../errors/errors.js';

type SubscriptionRequest<TParams extends ParamsDictionary> =
  AuthenticatedRequest<
    TParams,
    {
      name: string;
      amount: string;
      startDate: string;
      duration: Subscription['duration'];
      moneySource: string;
      uids?: string[];
    },
    DataQuery
  >;

export const getAllSubscriptions = async (
  req: SubscriptionRequest<{}>,
  res: APIPaginatedResponse<Partial<Subscription>>,
  next: NextFunction
): Promise<void> => {
  try {
    const subscriptions = await getSubscriptionsFromUser(
      req.user.userUid,
      req.query
    );
    const currentPage = Number(req.query.page) || 1;

    res.status(200).json({
      message: 'Subscriptions fetched successfully',
      totalPages: subscriptions.totalPages,
      previousPage: subscriptions.canPreviousPage
        ? `${process.env.SERVER_URL}/api/subscriptions?page=${currentPage - 1}`
        : null,
      nextPage: subscriptions.canNextPage
        ? `${process.env.SERVER_URL}/api/subscriptions?page=${currentPage + 1}`
        : null,
      data: subscriptions.data,
    });
  } catch (error) {
    next(error);
  }
};

export const createSubscription = async (
  req: SubscriptionRequest<{}>,
  res: APIResponse<Partial<Subscription> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const subscription = await generateSubscription(req.body, req.user.userUid);

    res.status(201).json({
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const editSubscription = async (
  req: SubscriptionRequest<{ uid: string }>,
  res: APIResponse<Partial<Subscription> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const subscription = await updateSubscription(
      req.params.uid,
      req.body,
      req.user.userUid
    );

    res.status(200).json({
      message: 'Subscription updated successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscription = async (
  req: SubscriptionRequest<{ uid: string }>,
  res: APIResponse<Partial<Subscription> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    const subscription = await removeSubscription(
      req.params.uid,
      req.user.userUid
    );

    res.status(200).json({
      message: 'Subscription deleted successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const multiDeleteSubscriptions = async (
  req: SubscriptionRequest<{}>,
  res: APIResponse<Partial<Subscription> | undefined>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.body.uids) {
      throw new NotFoundError('No subscription uids provided for deletion');
    }

    await bulkDeleteSubscriptions(req.body.uids, req.user.userUid);

    res.status(200).json({
      message: 'Multiple subscriptions deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
