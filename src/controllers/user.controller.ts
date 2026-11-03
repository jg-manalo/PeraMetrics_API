import {
  findUserByUuid,
  removeUser,
  updateUserInfo,
} from '../services/user.service.js';
import type { NextFunction } from 'express';
import type { User } from '../types/user.js';
import type { APIResponse } from '../types/api.js';
import type { AuthenticatedRequest } from '../types/api.js';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { UserResource } from '../types/resources.js';
import { revokeAllRefreshTokens } from '../utils/jwt.js';

type UserRequest<TParams extends ParamsDictionary> = AuthenticatedRequest<
  TParams,
  Pick<User, 'name' | 'email' | 'password'>,
  unknown
>;

export const getUserByUuid = async (
  req: UserRequest<{}>,
  res: APIResponse<UserResource>,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user.userUid;
    const user = await findUserByUuid(uid);

    res.status(200).json({
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const fetchUserCredentials = async (
  req: UserRequest<{}>,
  res: APIResponse<Pick<User, 'name' | 'email' | 'uid'>>,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user.userUid;
    const user = await findUserByUuid(uid);

    if (!user) {
      res.status(404).json({
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      message: 'User credentials retrieved successfully',
      data: {
        uid: user.uid,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: UserRequest<{ uid: string }>,
  res: APIResponse<Partial<User>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { uid } = req.params;

    const { name, email, password } = req.body;

    const updatedUser = await updateUserInfo(uid, name, email, password);

    res.status(200).json({
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: UserRequest<{ uid: string }>,
  res: APIResponse<void>,
  next: NextFunction
): Promise<void> => {
  try {
    const { uid } = req.params;

    await revokeAllRefreshTokens(uid);
    await removeUser(uid);

    res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
