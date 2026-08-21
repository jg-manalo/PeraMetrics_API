import jwt from 'jsonwebtoken';
import { NotFoundError } from '../errors/errors.js';
import { cache, revokeCachePipeline } from '../services/redis.service.js';
import crypto from 'crypto';
import { revokeCache } from '../services/redis.service.js';
import type { Response } from 'express';
import type { User } from '../types/user.js';
import { longTermTTL, shortTermTTL } from './ttl.js';

const accessTokenSecret = process.env.JWT_SECRET;
const accessTokenExpiration = '15m';
const refreshTokenExpiration = '30d';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateAccessToken = (
  user: Pick<User, 'uid' | 'email' | 'name'>
): string => {
  if (!accessTokenSecret) {
    throw new NotFoundError('JWT_SECRET is not defined');
  }

  const payload = {
    userUid: user.uid,
    name: user.name,
    email: user.email,
  };

  return jwt.sign(payload, accessTokenSecret, {
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
    expiresIn: rememberMe ? refreshTokenExpiration : shortTermTTL,
  });

  return token;
};

export const persistRefreshToken = async (
  user: Pick<User, 'uid' | 'email' | 'name'>,
  refreshToken: string,
  jti: string,
  ttl: number
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);

  const payload = JSON.stringify({
    user: {
      uid: user.uid,
      email: user.email,
      name: user.name,
    },
    tokenHash: tokenHash,
  });
  await cache(`sessions:${user.uid}:${jti}`, payload, {
    EX: ttl,
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
      path: '/api/auth/',
      maxAge: longTermTTL * 1000, // Convert to milliseconds
    });
  } else {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/api/auth/',
    });
  }
};

export const rotateRefreshToken = async (
  jti: string,
  user: Pick<User, 'uid' | 'email' | 'name'>,
  res: Response,
  rememberedMe: boolean
): Promise<string> => {
  await revokeRefreshToken(jti, user.uid);
  const newJti = createJti();
  const sessionOnly = false;

  const newAccessToken = generateAccessToken(user);

  const newRefreshToken = rememberedMe
    ? generateRefreshToken(user.uid, newJti, rememberedMe)
    : generateRefreshToken(user.uid, newJti, sessionOnly);

  if (rememberedMe) {
    await persistRefreshToken(user, newRefreshToken, newJti, longTermTTL);
  } else {
    await persistRefreshToken(user, newRefreshToken, newJti, shortTermTTL);
  }

  setRefreshTokenCookie(res, newRefreshToken);

  return newAccessToken;
};
