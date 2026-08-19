import jwt from 'jsonwebtoken';
import { NotFoundError } from '../errors/errors.js';
import { cache, revokeCachePipeline } from '../services/redis.service.js';
import crypto from 'crypto';
import { revokeCache } from '../services/redis.service.js';
import type { Response } from 'express';

const accessTokenSecret = process.env.JWT_SECRET;
const accessTokenExpiration = '15m';
const refreshTokenExpiration = '30d';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
const oneHourInSeconds = 1 * 60 * 60;

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateAccessToken = (userUid: string): string => {
  if (!accessTokenSecret) {
    throw new NotFoundError('JWT_SECRET is not defined');
  }

  return jwt.sign({ userUid: userUid }, accessTokenSecret, {
    expiresIn: accessTokenExpiration,
  });
};

export const createJti = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

export const generateRefreshToken = (
  userUid: string,
  jti: string,
  rememberMe: boolean
): string => {
  if (!refreshTokenSecret) {
    throw new NotFoundError('REFRESH_TOKEN_SECRET is not defined');
  }
  const payload = {
    userUid: userUid,
    jti: jti,
    rememberMe: rememberMe,
  };

  const token = jwt.sign(payload, refreshTokenSecret, {
    expiresIn: rememberMe ? refreshTokenExpiration : oneHourInSeconds,
  });

  return token;
};

export const persistShortLivedToken = async (
  userUid: string,
  refreshToken: string,
  jti: string
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  await cache(`sessions:${userUid}:${jti}`, tokenHash, {
    EX: oneHourInSeconds,
  });
};

export const persistRefreshToken = async (
  userUid: string,
  refreshToken: string,
  jti: string
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  await cache(`sessions:${userUid}:${jti}`, tokenHash, {
    EX: thirtyDaysInSeconds,
  });
};

export const revokeRefreshToken = async (
  jti: string,
  userUid: string
): Promise<void> => {
  await revokeCache(`sessions:${userUid}:${jti}`);
};

export const revokeAllRefreshTokens = async (
  userUid: string
): Promise<void> => {
  const pattern = `sessions:${userUid}:*`;
  await revokeCachePipeline(pattern);
};

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
  isPersistent: boolean = false
): void => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isPersistent) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/api/auth/refresh',
      maxAge: thirtyDaysInSeconds * 1000, // Convert to milliseconds
    });
  } else {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/api/auth/refresh',
    });
  }
};

export const rotateRefreshToken = async (
  jti: string,
  userUid: string,
  res: Response,
  rememberedMe: boolean
): Promise<string> => {
  await revokeRefreshToken(jti, userUid);
  const newJti = createJti();
  const sessionOnly = false;

  const newAccessToken = generateAccessToken(userUid);

  const newRefreshToken = rememberedMe
    ? generateRefreshToken(userUid, newJti, rememberedMe)
    : generateRefreshToken(userUid, newJti, sessionOnly);

  if (rememberedMe) {
    await persistRefreshToken(userUid, newRefreshToken, newJti);
  } else {
    await persistShortLivedToken(userUid, newRefreshToken, newJti);
  }

  setRefreshTokenCookie(res, newRefreshToken);

  return newAccessToken;
};
