import {generateMoneySource, editMoneySourceName, removeMoneySource} from '../services/moneysource.service';
import type {Request, Response, NextFunction} from 'express';
import {moneysourceValidation} from '../validations/moneysource.validation';
import { formatValidationError } from '../validations/format';
import logger from '../config/logger';
import type { ZodSafeParseResult } from 'zod';

type MoneySourceRequest = Request<{name: string, uid: string}> & {user?: {userUid?: string }};

export const createMoneySource = async (req: MoneySourceRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {name, initialAmount}: { name: string, initialAmount?: number } = req.body;
        const userUid: string | undefined = req.user?.userUid;

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        const validateMoneySource: ZodSafeParseResult<{ name: string }> = moneysourceValidation.safeParse(req.body);

        if(!validateMoneySource.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateMoneySource.error)
            });
        }

        const newSource = await generateMoneySource(name, userUid, initialAmount);

        return res.status(201).json({
            message: "Money source created successfully",
            source: newSource
        });

    }catch (error) {

        if (error instanceof Error && error.message === 'Money source with this name already exists') {
            return res.status(400).json({
                message: error.message
            });
        }

        next(error);
    }
}

export const editMoneySource = async (req: MoneySourceRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {uid} : {uid: string} = req.params;
        const {name} : { name: string } = req.body;
        const userUid: string | undefined = req.user?.userUid;
        const validateMoneySource: ZodSafeParseResult<{ name: string }> = moneysourceValidation.safeParse(req.body);

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        if(!validateMoneySource.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateMoneySource.error)
            });
        }

        const updatedSource = await editMoneySourceName(uid, name, userUid);

        return res.status(200).json({
            message: "Money source updated successfully",
            source: updatedSource
        });

    } catch (error) {

        logger.error(`Error editing money source: ${error}`);

        if (error instanceof Error && error.message === 'You are not authorized to edit this money source') {
            return res.status(401).json({
                message: error.message
            });
        }

        if (error instanceof Error && error.message === 'Money source with this name already exists') {
            return res.status(400).json({
                message: error.message
            });
        }

        next(error);
    }
}

export const deleteMoneySource = async (req: MoneySourceRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
        const { uid }: { uid: string } = req.params;
        const userUid: string | undefined = req.user?.userUid;

        if (!userUid) {
            return res.status(404).json({
                message: "Requesting user not found"
            });
        }

        const toDelete = await removeMoneySource(uid, userUid);

        return res.status(200).json({
            message: "Money source deleted successfully",
            source: toDelete
        });

    }catch (error) {
        
        if (error instanceof Error && error.message === 'You are not authorized to delete this money source') {
            return res.status(401).json({
                message: error.message
            });
        }

        if (error instanceof Error && error.message === 'Money source not found') {
            return res.status(404).json({
                message: error.message
            });
        }
        next(error);
    }
}