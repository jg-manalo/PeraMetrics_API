import type {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';
import type { AuthTokenPayload } from '../types/api';

const isAuthTokenPayload = (payload : string | jwt.JwtPayload) : payload is AuthTokenPayload => {
    return typeof payload === 'object' && !!payload && 'userUid' in payload;
};

export const verifyToken = (req: Request & {user: AuthTokenPayload}, res: Response, next: NextFunction): void => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        res.status(401).json({
            message: 'Access denied. No token provided'
        });
        return;
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);

        if (!isAuthTokenPayload(decoded)) {
            res.status(404).json({
                message: 'Token contains invalid payload'
            });
            return;
        }

        req.user = decoded;
        
        next();
    } catch (error) {
        logger.error(`Token verification failed: ${error}`);

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                message: `Verification failed: ${error.message}`
            });
            return;
        } 
        
        res.status(500).json({
            message: 'Internal server error during token verification'
        });

        return;
    }
};