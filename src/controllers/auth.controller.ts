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
} from '../utils/jwt.js';
import { GoneError, UnauthorizedError, ValueError } from '../errors/errors.js';
import {
  cache,
  getCachedValue,
  lookupCache,
  revokeCache,
} from '../services/redis.service.js';
import { sendEmail } from '../services/mail.service.js';
import type { Request, NextFunction } from 'express';
import type { User } from '../types/user.js';
import type { APIResponse, AuthTokenPayload } from '../types/api.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import {
  persistRefreshToken,
  createJti,
  rotateRefreshToken,
} from '../utils/jwt.js';
import { shortTermTTL, longTermTTL } from '../utils/ttl.js';
import jwt from 'jsonwebtoken';

type RefreshTokenPayload = jwt.JwtPayload & {
  jti: string;
  userUid: string;
  rememberMe: boolean;
  accessToken: string;
};

type UserCache = {
  user: {
    uid: string;
    email: string;
    name: string;
  };
  tokenHash: string;
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

export const getUserWithToken = async (
  req: Request,
  res: APIResponse<AuthTokenPayload>,
  next: NextFunction
): Promise<void> => {
  try {
    const user: AuthTokenPayload = {
      userUid: req.user.userUid,
      name: req.user.name,
      email: req.user.email,
    };

    const accessToken = req.headers['authorization']?.split(' ')[1];

    res.status(200).json({
      message: 'User retrieved successfully',
      data: user,
      token: accessToken,
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

    const token = generateAccessToken(user);
    const jti = createJti();
    const refreshToken = generateRefreshToken(user.uid, jti, rememberMe);

    if (rememberMe) {
      const isPersistent = true;
      await persistRefreshToken(user, refreshToken, jti, longTermTTL);
      setRefreshTokenCookie(res, refreshToken, isPersistent);
    } else {
      setRefreshTokenCookie(res, refreshToken);
      await persistRefreshToken(user, refreshToken, jti, shortTermTTL);
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
    const token = getRefreshToken(req);
    const tokenHash = hashToken(token);
    const decoded = decodeRefreshToken(token);
    const { jti, userUid } = getDecodedObject(decoded);

    const cache = await lookupCache(`sessions:${userUid}:${jti}`);
    const tokenFromSession: UserCache['tokenHash'] | null = cache
      ? JSON.parse(cache).tokenHash
      : null;

    if (!tokenFromSession) {
      throw new UnauthorizedError(
        'Refresh token has already been revoked or expired'
      );
    }

    if (tokenFromSession !== tokenHash) {
      await revokeRefreshToken(jti, userUid);
      throw new UnauthorizedError('Refresh token does not match the user');
    }

    await revokeRefreshToken(jti, userUid);
    res.clearCookie('refreshToken', { path: '/api/auth/' });

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request & {
    cookies: { refreshToken?: string };
  },
  res: APIResponse<void>,
  next: NextFunction
) => {
  try {
    const token = getRefreshToken(req);
    const decoded = decodeRefreshToken(token);
    const { jti, userUid, rememberMe } = getDecodedObject(decoded);

    if (!jti || !userUid) {
      throw new UnauthorizedError('Malformed refresh token payload');
    }

    const tokenHash = hashToken(token);

    const redisKey = `sessions:${userUid}:${jti}`;
    const cache = await lookupCache(redisKey);

    const cachePayload: UserCache | null = cache ? JSON.parse(cache) : null;

    if (!cachePayload?.tokenHash) {
      await revokeCache(redisKey);
      throw new UnauthorizedError('Refresh token has been revoked or expired');
    }

    if (tokenHash !== cachePayload.tokenHash) {
      await revokeCache(redisKey);
      throw new UnauthorizedError('Refresh token does not match');
    }

    const newAccessToken = await rotateRefreshToken(
      jti,
      cachePayload.user,
      res,
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

const getRefreshToken = (req: Request): string => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new UnauthorizedError('No refresh token provided');
  }
  return token;
};

const decodeRefreshToken = (token: string): string | jwt.JwtPayload => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new UnauthorizedError(
      'Refresh token secret not found in environment variables'
    );
  }
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

const isRefreshTokenPayload = (
  payload: string | jwt.JwtPayload
): payload is RefreshTokenPayload => {
  return (
    typeof payload === 'object' &&
    !!payload &&
    'jti' in payload &&
    'userUid' in payload
  );
};

const getDecodedObject = (
  decoded: string | jwt.JwtPayload
): RefreshTokenPayload => {
  if (!isRefreshTokenPayload(decoded)) {
    throw new ValueError('Invalid refresh token payload');
  }

  const { jti, userUid, rememberMe, accessToken } = decoded;

  return { jti, userUid, rememberMe, accessToken };
};
