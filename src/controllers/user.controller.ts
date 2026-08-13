import {
  findUserByUuid,
  removeUser,
  updateUserInfo,
} from '../services/user.service.js';
import type { Request, Response, NextFunction } from 'express';
import { userUpdateValidation } from '../validations/user.validation.js';
import { formatValidationError } from '../validations/format.js';
import { ZodSafeParseResult } from 'zod';
import type { User } from '../types/user.js';

export const getUserByUuid = async (
  req: Request<{ uid: string }>,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const { uid }: { uid: string | undefined } = req.params;

    const user = await findUserByUuid(uid);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request<{ uid: string }>,
  res: Response,
  next: NextFunction,
): Promise<Response | undefined> => {
  try {
    const { uid }: { uid: string | undefined } = req.params;

    const {
      name,
      email,
      password,
    }: { name?: string; email?: string; password?: string } = req.body;

    const validateUser: ZodSafeParseResult<Partial<User>> =
      userUpdateValidation.safeParse(req.body);

    if (!validateUser.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: formatValidationError(validateUser.error),
      });
    }

    const updatedUser = await updateUserInfo(uid, name, email, password);

    return res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message === 'Email already in use by another user'
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
};

export const deleteUser = async (
  req: Request<{ uid: string }>,
  res: Response,
  next: NextFunction,
): Promise<Response | undefined> => {
  try {
    const { uid }: { uid: string | undefined } = req.params;

    await removeUser(uid);

    return res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    next(error);
  }
};
