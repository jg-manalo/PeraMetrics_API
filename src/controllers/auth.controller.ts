import {createUser, findUserByEmail, updateUserPassword} from '../services/user.service';
import { formatValidationError } from '../validations/format';
import {userValidation} from '../validations/user.validation';
import type {Request, Response, NextFunction} from 'express';
import type {User} from '../types/user';
import bcrypt from 'bcrypt';
import {generateToken} from '../utils/jwt';


import crypto from 'crypto';
import redisClient from '../config/redis';
import { updatePasswordValidation } from '../validations/user.validation';

export const registerUser = async (req: Request<User>, res: Response, next: NextFunction): Promise<void | Response> => {
    try{

        const validateUser = userValidation.safeParse(req.body);

        if(!validateUser.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validateUser.error)
            });
        }

        const {name, email, password} = req.body;

        const user = await createUser(name, email, password);

        if (!user) {
            return res.status(500).json({
                message: "Failed to create user"
            });
        }

        return res.status(201).json({
            message: "User registered successfully",
            user
        });

    } catch(error){
        next(error);
    }
}

export const loginUser = async (req: Request<Pick<User, 'email' | 'password'>>, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {email, password} = req.body;

        const user = await findUserByEmail(email);

        const isValidPassword =  user ? await bcrypt.compare(password, user.password) : false;

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        } else {
            const token = generateToken(user?.uid!);

            return res.status(200).json({
                message: "Login successful",
                user: {
                    uid: user?.uid,
                    email: user?.email,
                    name: user?.name
                },
                token
            });
        }

    } catch (error){
        next(error);
    }
}

export const requestPasswordReset = async (req: Request<Pick<User, 'email'>>, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {email} : {email: string} = req.body;

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const token: string = crypto.randomBytes(32).toString('hex');
        const tokenHash: string = crypto.createHash('sha256').update(token).digest('hex');
        const threeMinutesInSeconds: number = 60 * 3;

        const cacheToken = await redisClient.set(`passwordReset:${tokenHash}`, user.email, { EX: threeMinutesInSeconds });

        if (!cacheToken) {
            throw new Error("Failed to cache password reset token");
        }

        //TODO: implement email sending logic here to send the token to the user's email address

        return res.status(200).json({
            message: "Password reset token generated successfully",
            tokenHash: tokenHash,
            expiration: `${threeMinutesInSeconds} seconds`
        });

    }catch (error){
        if (error instanceof Error) {
            return res.status(500).json({
                message: "Internal server error",
                error: error.message
            });
        }
        next(error);
    }
}

export const resetPassword = async (req: Request<{tokenHash: string}>, res: Response, next: NextFunction): Promise<void | Response> => {
    try{
        const {tokenHash} : {tokenHash: string} = req.params;
        const {password} : {password: string} = req.body;
        const email = await redisClient.getDel(`passwordReset:${tokenHash}`);
   
        if (!email) {
            return res.status(410).json({
                message: 'Password reset token has expired or is invalid'
            });
        }

        const validatePassword = updatePasswordValidation.safeParse({password});

        if (!validatePassword.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: formatValidationError(validatePassword.error)
            });
        }

        await updateUserPassword(email, password);

        return res.status(200).json({
            message: "Password reset successful"
        });

    }catch (error){
        if (error instanceof Error) {
            return res.status(500).json({
                message: "Internal server error",
                error: error.message
            });
        }

        if (error instanceof Error && error.message === 'User not found') {
            return res.status(404).json({
                message: "User not found"
            });
        }
        
        next(error);
    }
}