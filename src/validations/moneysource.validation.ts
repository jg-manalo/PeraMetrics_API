import { z } from 'zod';

export const moneysourceValidation = z.object({
    name: z.string().trim().min(1, { message: "Name is required" }),
    initialAmount: z.number().optional().default(0)
});