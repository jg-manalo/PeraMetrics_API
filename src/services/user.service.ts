import {db} from '../config/database';
import {users} from '../models/users';
import {eq} from 'drizzle-orm';
import bcrypt from 'bcrypt';
import type {User} from '../types/user';
import {userResource} from '../resources/user.resource';
import type {UserResource} from '../types/resources';
import logger from '../config/logger';

export const hashPassword = async (password: string): Promise<string> => {
    try{
        return await bcrypt.hash(password, 10);
    }catch (error) {
        throw error;
    }
}

export const createUser = async (name: string, email: string, password: string): Promise<Omit<User, 'password'> | undefined> => {
    try{
        const existingUser: User | undefined = await db.query.users.findFirst({
            where: {
                email: email
            }
        });

       if(existingUser){
            throw new Error('User with this email already exists');
        }
        
        const hashedPassword: string = await hashPassword(password);

        const [newUser]: Omit<User, 'password'>[] = await db.insert(users).values({
            name,
            email,
            password: hashedPassword
        }).returning({
            id: users.id,
            uid: users.uid,
            name: users.name,
            email: users.email
        });

        return newUser;
    }catch (error) {
        throw error;
    }
}



export const updateUserInfo = async (uuid: string, name?: string, email?: string, password?: string): Promise<Partial<User> | undefined> => {
    try {

        const existingUser: User | undefined = await db.query.users.findFirst({
            where: {
                uid: uuid
            }
        });

        if(!existingUser){
            throw new Error('User not found');
        }

        if (email){
         
            const emailExists = await findUserByEmail(email);
         
            if(emailExists && emailExists.uid !== uuid){
                throw new Error('Email already in use by another user');
            }

        }
        const [updatedUser]: Partial<User>[] = await db.update(users).set({
            name: name || existingUser.name,
            email: email || existingUser.email,
            password: password ? await hashPassword(password) : existingUser.password,
            updatedAt: new Date()

        }).where(eq(users.uid, uuid)).returning({
            id: users.id,
            uid: users.uid,
            name: users.name,
            email: users.email
        });

        return updatedUser;

    }catch (error) {
        logger.error(`Error updating user info for uuid ${uuid}:`, error);
        throw error;
    }
}


export const findUserByEmail = async (email: string): Promise<User | undefined> => {
    try{
        const user: User | undefined = await db.query.users.findFirst({
            where: {
                email: email
            }
        });

        if(!user){
            return undefined;
        }

        return user;
    }catch (error) {
        logger.error(`Error finding user by email ${email}:`, error);
        throw error;
    }
}

export const findUserByUuid = async (uuid: string): Promise<UserResource | undefined> => {
    try{
        const user: User | undefined = await db.query.users.findFirst({
            where: {
                uid: uuid
            },  
            with: {
                moneySources: true,
                transactions: true
            }
        });

        if(!user){
            return undefined;
        }

        return userResource(user);
    } catch (error) {
        logger.error(`Error finding user by uuid ${uuid}:`, error);
        throw error;
    }
}

export const removeUser = async (uuid: string): Promise<void> => {
    try{
        
        const user = await findUserByUuid(uuid);

        if(!user){
            throw new Error('User not found');
        }
        
        await db.delete(users).where(eq(users.uid, uuid));
    }catch (error) {
        logger.error(`Error removing user with uuid ${uuid}:`, error);
        throw error;
    }
}

export const updateUserPassword = async (email:string, password: string): Promise<void> => {
    try{
        const user = await findUserByEmail(email);

        if(!user){
            throw new Error('User not found');
        }

        await db.update(users).set({
            password: await hashPassword(password),
            updatedAt: new Date()
        }).where(eq(users.email, email));

    } catch (error) {
        logger.error(`Error updating password for user with email ${email}:`, error);
        throw error;
    }
}