import { z } from 'zod';

export const userValidation = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" })
});

export const userUpdateValidation = z.object({
    name: z.string().min(1, { message: "Name is required" }).optional(),
    email: z.email({ message: "Invalid email address" }).optional(),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }).optional()
})