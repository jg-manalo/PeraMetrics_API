import type { AuthTokenPayload } from '../types/api';

declare global {
    namespace Express {
        interface Request {
            user: AuthTokenPayload;
        }
    }
}

export {};