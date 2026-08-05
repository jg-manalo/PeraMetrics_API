class AppError extends Error {
    statusCode: number;
    message: string;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
    }
}

class ValidationError extends AppError {
    name: string;
    constructor(message: string) {
        super(400, message);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    name: string;
    constructor(message: string) {
        super(404, message);
        this.name = 'NotFoundError';
    }
}

class ForbiddenError extends AppError {
    name: string;
    constructor(message: string) {
        super(403, message);
        this.name = 'ForbiddenError';
    }
}

class UnauthorizedError extends AppError {
    name: string;
    constructor(message: string) {
        super(401, message);
        this.name = 'UnauthorizedError';
    }
}

class ValueError extends AppError {
    name: string
    constructor(message: string) {
        super(400, message);
        this.name = 'ValueError';
    }
}

class DuplicateError extends AppError {
    name: string
    constructor(message: string) {
        super(409, message);
        this.name = 'DuplicateError';
    }
}

export {ValidationError, NotFoundError, ForbiddenError, UnauthorizedError, ValueError, DuplicateError};