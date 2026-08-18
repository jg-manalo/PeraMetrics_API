import {
  createUser,
  findUserByEmail,
  updateUserPassword,
} from '../services/user.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  hashToken,
  revokeRefreshToken,
  persistShortLivedToken,
} from '../utils/jwt.js';
import { GoneError, UnauthorizedError } from '../errors/errors.js';
import {
  cache,
  getCachedValue,
  lookupCache,
  revokeCache,
} from '../services/redis.service.js';
import { sendEmail } from '../services/mail.service.js';
import type { Request, NextFunction } from 'express';
import type { User } from '../types/user.js';
import type { APIResponse } from '../types/api.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import {
  persistRefreshToken,
  createJti,
  rotateRefreshToken,
} from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

type RefreshTokenPayload = jwt.JwtPayload & {
  jti: string;
  userUid: string;
};

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
  req: Request<
    {},
    unknown,
    Pick<User, 'email' | 'password'> & { rememberMe: boolean }
  >,
  res: APIResponse<Omit<User, 'password' | 'id'> | string>,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await findUserByEmail(email);

    const isValidPassword = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user) {
      const token = generateAccessToken(user.uid);
      const jti = createJti();
      const refreshToken = generateRefreshToken(user.uid, jti, rememberMe);

      if (rememberMe) {
        const isPersistent = true;
        await persistRefreshToken(user.uid, refreshToken, jti);
        setRefreshTokenCookie(res, refreshToken, isPersistent);
      } else {
        setRefreshTokenCookie(res, refreshToken);
        await persistShortLivedToken(user.uid, refreshToken, jti);
      }

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

export const logoutUser = async (
  req: Request,
  res: APIResponse<void>,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new UnauthorizedError(
        'Refresh token secret not found in environment variables'
      );
    }
    if (token) {
      //TODO: can be refactored into a reusable function to avoid code duplication with refreshToken function
      const tokenHash = hashToken(token);
      const decoded = jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET
      ) as RefreshTokenPayload;

      const { jti, userUid } = decoded;
      const userFromSession = await lookupCache(
        `refreshToken:${tokenHash}:${jti}`
      );

      if (userFromSession !== userUid) {
        await revokeCache(`refreshToken:${tokenHash}:${jti}`);
        throw new UnauthorizedError('Refresh token does not match the user');
      }

      await revokeRefreshToken(tokenHash, jti);
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

      res.status(200).json({
        message: 'Logout successful',
      });
    }
  } catch (error) {
    next(error);
  }
};

// TODO: paano aabot yung rememberMe value dito? Dapat ba i-pass sa refreshToken function?
export const refreshToken = async (
  req: Request & {
    cookies: { refreshToken?: string };
  },
  res: APIResponse<void>,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedError('No refresh token provided');
    }

    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new UnauthorizedError(
        'Refresh token secret not found in environment variables'
      );
    }

    let decoded: RefreshTokenPayload;

    try {
      decoded = jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET
      ) as RefreshTokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const { jti, userUid, rememberMe } = decoded as jwt.JwtPayload & {
      jti: string | undefined;
      userUid: string;
      rememberMe: boolean;
    };

    if (!jti || !userUid) {
      throw new UnauthorizedError('Malformed refresh token payload');
    }

    const tokenHash = hashToken(token);

    const redisKey = `refreshToken:${tokenHash}:${jti}`;
    const userFromSession = await lookupCache(redisKey);

    if (!userFromSession) {
      await revokeCache(redisKey);
      throw new UnauthorizedError('Refresh token has been revoked or expired');
    }

    if (userUid !== userFromSession) {
      await revokeCache(redisKey);
      throw new UnauthorizedError('Refresh token does not match the user');
    }

    const newAccessToken = await rotateRefreshToken(
      jti,
      userUid,
      res,
      tokenHash,
      rememberMe
    );

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newAccessToken,
    });
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
