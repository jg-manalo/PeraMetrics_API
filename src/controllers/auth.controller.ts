import {createUser, findUserByEmail} from '../services/user.service';
import { formatValidationError } from '../validations/format';
import {userValidation} from '../validations/user.validation';
import type {Request, Response, NextFunction} from 'express';
import type {User} from '../types/user';
import bcrypt from 'bcrypt';
import {generateToken} from '../utils/jwt';

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