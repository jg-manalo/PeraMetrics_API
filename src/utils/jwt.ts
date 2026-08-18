import jwt from 'jsonwebtoken';
import { NotFoundError } from '../errors/errors.js';
import { cache } from '../services/redis.service.js';
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
  await cache(`refreshToken:${tokenHash}:${jti}`, userUid, {
    EX: oneHourInSeconds,
  });
};
export const persistRefreshToken = async (
  userUid: string,
  refreshToken: string,
  jti: string
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  await cache(`refreshToken:${tokenHash}:${jti}`, userUid, {
    EX: thirtyDaysInSeconds,
  });
};
export const revokeRefreshToken = async (
  tokenHash: string,
  jti: string
): Promise<void> => {
  revokeCache(`refreshToken:${tokenHash}:${jti}`);
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

// TODO: paano papasok yung rememberMe sa refresh token rotation?
export const rotateRefreshToken = async (
  jti: string,
  userUid: string,
  res: Response,
  rememberedMe = true
): Promise<string> => {
  await revokeRefreshToken(userUid, jti);
  const newJti = createJti();
  const sessionOnly = !rememberedMe;

  const newRefreshToken = rememberedMe
    ? generateRefreshToken(userUid, newJti, rememberedMe)
    : generateRefreshToken(userUid, newJti, sessionOnly);
  await persistRefreshToken(userUid, newRefreshToken, newJti);
  setRefreshTokenCookie(res, newRefreshToken);

  return newRefreshToken;
};
