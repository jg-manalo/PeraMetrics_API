import { z } from 'zod';

export const moneySourceValidation = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  initialAmount: z.string().optional().default('0.00'),
});
