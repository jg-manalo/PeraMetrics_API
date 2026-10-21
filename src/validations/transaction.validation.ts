import { z } from 'zod';
export const transactionValidation = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  date: z
    .string()
    .trim()
    .min(1, { message: 'Date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Date must be in YYYY-MM-DD format',
    })
    .optional(),
  amount: z
    .string()
    .trim()
    .min(1, { message: 'Amount is required' })
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Amount must be a valid number with up to two decimal places',
    }),
  moneySource: z
    .string()
    .trim()
    .min(1, { message: 'Money source is required' }),
  destinationMoneySource: z
    .string()
    .trim()
    .min(1, { message: 'Transfer destination is required' })
    .optional(),
});
