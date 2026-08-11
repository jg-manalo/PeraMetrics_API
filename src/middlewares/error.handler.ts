import type { Request, Response, NextFunction } from 'express';
import { ValidationError, NotFoundError, ForbiddenError, UnauthorizedError, ValueError, DuplicateError, BadRequestError, GoneError } from '../errors/errors';

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof UnauthorizedError) {
        res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof ForbiddenError) {
        res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ message: err.message });
    }  else if (err instanceof BadRequestError) {
        res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof NotFoundError) {
        res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof DuplicateError) {
        res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof GoneError){
        res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof ValueError) {
        res.status(err.statusCode).json({ message: err.message });
    } else {
        res.status(500).json({ message: 'Internal Server Error' });
    }
    return;
}