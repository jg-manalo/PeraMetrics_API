import {generateMoneySource, editMoneySourceName, removeMoneySource} from '../services/moneysource.service';
import type {NextFunction} from 'express';
import type {AuthenticatedRequest} from '../types/api';
import type {ParamsDictionary} from 'express-serve-static-core';
import type {APIResponse} from '../types/api';
import type {MoneySource} from '../types/moneysource';

type MoneySourceRequest<TParams extends ParamsDictionary> = AuthenticatedRequest<TParams, { name: string, initialAmount?: number }, {}>;

export const createMoneySource = async (req: MoneySourceRequest<{}>, res: APIResponse<Partial<MoneySource> | undefined>, next: NextFunction): Promise<void> => {
    try{
        const {name, initialAmount} = req.body;
        const userUid = req.user?.userUid;

        const newSource = await generateMoneySource(name, userUid, initialAmount);

        res.status(201).json({
            message: "Money source created successfully",
            data: newSource
        });

    }catch (error) {
        next(error);
    }
}

export const editMoneySource = async (req: MoneySourceRequest<{uid: string}>, res: APIResponse<Partial<MoneySource> | undefined>, next: NextFunction): Promise<void> => {
    try{
        const {uid}  = req.params;
        const {name} = req.body;
        const userUid = req.user.userUid;
     
        const updatedSource = await editMoneySourceName(uid, name, userUid);

        res.status(200).json({
            message: "Money source updated successfully",
            data: updatedSource
        });

    } catch (error) {
        next(error);
    }
}

export const deleteMoneySource = async (req: MoneySourceRequest<{uid: string}>, res: APIResponse<Partial<MoneySource> | undefined>, next: NextFunction): Promise<void> => {
    try {
        const { uid } = req.params;
        const userUid = req.user.userUid;


        const toDelete = await removeMoneySource(uid, userUid);

        res.status(200).json({
            message: 'Money source deleted successfully',
            data: toDelete
        });

    }catch (error) {
        next(error);
    }
}