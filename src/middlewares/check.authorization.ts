import type {NextFunction} from 'express';
import type {AuthenticatedRequest, APIResponse} from '../types/api.js';

type UserRequest = AuthenticatedRequest<{uid: string}, {}, {}> 

export const checkAuthorizationForUserCredentials = (req: UserRequest, res: APIResponse<void>, next: NextFunction): void => {
    const {uid}  = req.params;

    if(uid !== req.user?.userUid){
        res.status(403).json({
            message: "Forbidden. You are not authorized to access this resource"
        });
        return;
    }

    next();
}
