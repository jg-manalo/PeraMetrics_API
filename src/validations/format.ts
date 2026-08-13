import { ZodError } from "zod";

export const formatValidationError = (error: unknown): string[] => {
    if (!(error instanceof ZodError)) {
        return ['Validation failed'];
    }

    return error.issues.map((issue) => {
        const field = issue.path.join('.');

        return field
            ? `${field}: ${issue.message}`
            : issue.message;
    });
};