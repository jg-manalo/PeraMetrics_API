import type {Request, Response, NextFunction} from 'express';
import type {AuthTokenPayload} from '../types/api.js';
import {NotFoundError} from '../errors/errors.js';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

const isAuthTokenPayload = (payload : string | jwt.JwtPayload) : payload is AuthTokenPayload => {
    return typeof payload === 'object' && !!payload && 'userUid' in payload;
};

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        res.status(401).json({
            message: 'Access denied. No token provided'
        });
        return;
    }

    try{
        if (!process.env.JWT_SECRET) {
            throw new NotFoundError('JWT secret not found in environment variables');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!isAuthTokenPayload(decoded)) {
            throw new NotFoundError('Token contains invalid payload');
        }

        req.user = decoded;
        
        next();
    } catch (error) {
        logger.error(`Token verification failed: ${error}`);
        next(error);
        // if (error instanceof jwt.JsonWebTokenError) {
        //     res.status(401).json({
        //         message: `Verification failed: ${error.message}`
        //     });
        //     return;
        // } 
        return;
    }
};