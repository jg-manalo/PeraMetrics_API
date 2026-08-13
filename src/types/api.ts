import type { Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

export type APIResponse<T> = Response<
  { message: string; data?: T; token?: string } | { errors?: string | string[] }
>;

export type AuthTokenPayload = jwt.JwtPayload & {
  userUid: string;
};

export type AuthenticatedRequest<
  TParams extends ParamsDictionary,
  TReqBody,
  TQuery,
> = Request<TParams, unknown, TReqBody, TQuery> & { user: AuthTokenPayload };
