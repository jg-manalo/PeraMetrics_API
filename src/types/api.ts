import type { Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

export type APIResponse<T> = Response<
  { message: string; data?: T; token?: string } | { errors?: string | string[] }
>;

export type APIPaginatedResponse<T> = Response<{
  message: string;
  data: T[];
  totalPages: number;
  previousPage: string | null;
  nextPage: string | null;
  errors?: string | string[];
}>;

export type APISimpleResponse = Response<
  { message: string; token?: string } | { errors?: string | string[] }
>;

export type AuthTokenPayload = jwt.JwtPayload & {
  userUid: string;
  name: string;
  email: string;
};

export type AuthenticatedRequest<
  TParams extends ParamsDictionary,
  TReqBody,
  TQuery,
> = Request<TParams, unknown, TReqBody, TQuery> & { user: AuthTokenPayload };

export type PaginatedData<T> = {
  totalPages: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  data: T[];
};
