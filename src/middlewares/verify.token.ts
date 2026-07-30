import type {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';

export type AuthTokenPayload = jwt.JwtPayload & {
    userUid?: string;
};

export type AuthenticatedRequest = Request & {user?: AuthTokenPayload};

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);

        if (!decoded || typeof decoded !== 'object' || !('userUid' in decoded)) {
            return res.status(400).json({
                message: "Invalid token."
            });
        }
        req.user = decoded;
        
        next();
    } catch (error) {
        logger.error(`Token verification failed: ${error}`);

        return res.status(400).json({
            message: "Invalid token."
        });
    }
};