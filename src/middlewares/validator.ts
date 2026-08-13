import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { formatValidationError } from '../validations/format.js';

export const validateData = (schema: z.ZodObject<any, any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationError(error);
        res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
};
