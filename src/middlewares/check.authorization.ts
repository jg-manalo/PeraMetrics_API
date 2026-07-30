import type { Request, Response, NextFunction } from 'express';
import {getMoneySourceByUuid} from '../services/moneysource.service';

type UserRequest = Request<{uid: string}> & {user?: {userUid?: string }};

export const checkAuthorizationForUserCredentials = (req: UserRequest, res: Response, next: NextFunction): Response | void => {
    const {uid} : {uid: string | undefined} = req.params;

    if (!uid) {
        return res.status(400).json({
            message: "Invalid request parameters"
        });
    }

    if(uid !== req.user?.userUid){
        return res.status(403).json({
            message: "Forbidden. You are not authorized to access this resource"
        });
    }

    next();
}
