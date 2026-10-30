import { z } from 'zod';

export const subscriptionValidation = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  amount: z.string().trim().min(1, { message: 'Amount is required' }),
  startDate: z.coerce.date(),
  duration: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'BIENNIAL']),
  moneySource: z
    .string()
    .trim()
    .min(1, { message: 'Money source is required' }),
});
