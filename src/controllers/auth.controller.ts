import {
  createUser,
  findUserByEmail,
  updateUserPassword,
} from '../services/user.service.js';
import { generateToken } from '../utils/jwt.js';
import { GoneError, UnauthorizedError } from '../errors/errors.js';
import { cache, getCachedValue } from '../services/redis.service.js';
import { sendEmail } from '../services/mail.service.js';
import type { Request, NextFunction } from 'express';
import type { User } from '../types/user.js';
import type { APIResponse } from '../types/api.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const registerUser = async (
  req: Request<{}, unknown, User>,
  res: APIResponse<Omit<User, 'password'>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const data = await createUser(name, email, password);

    res.status(201).json({
      message: 'User registered successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request<{}, unknown, Pick<User, 'email' | 'password'>>,
  res: APIResponse<Omit<User, 'password' | 'id'> | string>,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);

    const isValidPassword = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user) {
      const token = generateToken(user.uid);
      res.status(200).json({
        message: 'Login successful',
        data: {
          uid: user?.uid,
          email: user?.email,
          name: user?.name,
        },
        token,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset = async (
  req: Request<{}, unknown, Pick<User, 'email'>>,
  res: APIResponse<void>,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await findUserByEmail(email);

    const token: string = crypto.randomBytes(32).toString('hex');
    const tokenHash: string = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    const threeMinutesInSeconds: number = 60 * 3;

    await cache(`passwordReset:${tokenHash}`, user.email, {
      EX: threeMinutesInSeconds,
    });

    const html = `Hello <b>${user.name}</b>,<br><br>We received a request to reset your password. Please use the following token to reset your password:<br><br>
        Token: <b>${tokenHash}</b><br><br>
        This token will expire in <b>3 minutes</b>.<br><br>
        If you did not request a password reset, please ignore this email.<br><br>
        Thank you,<br>
        Perametrics`;

    res.status(200).json({
      message:
        'Password reset token generated successfully. Please check your email for the token',
    });

    await sendEmail(user.email, 'Password Reset Request', html);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request<{}, unknown, { tokenHash: string; password: string }>,
  res: APIResponse<void>,
  next: NextFunction
): Promise<void> => {
  try {
    const { tokenHash, password } = req.body;

    const email = await getCachedValue(`passwordReset:${tokenHash}`);

    if (!email) {
      throw new GoneError('Password reset token has expired or is invalid');
    }

    await updateUserPassword(email, password);

    res.status(200).json({
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};
