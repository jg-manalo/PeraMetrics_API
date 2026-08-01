import {db} from '../config/database';
import {moneySources} from '../models/moneysources';
import {eq, and} from 'drizzle-orm';
import type {User} from '../types/user';
import type {MoneySource} from '../types/moneysource';
import logger from '../config/logger';
import type {DatabaseTransaction} from '../types/databasetransaction';

export const generateMoneySource = async (name: string, userUid: User['uid'], initialAmount?: number): Promise<Partial<MoneySource> | undefined> => {
    try{
        const sourceName = name.trim().toUpperCase();

        const existingSource: MoneySource | undefined = await db.query.moneySources.findFirst({
            where: {
                name: sourceName,
                user: userUid
            }
        });
     
        if(existingSource){
            throw new Error('Money source with this name already exists');
        }
        
        const [newSource]: Partial<MoneySource>[] = await db.insert(moneySources).values({
            name: sourceName,
            user: userUid,
            amount: initialAmount? initialAmount.toString() : '0'

        }).returning({
            id: moneySources.id,
            uid: moneySources.uid,
            user: moneySources.user,
            name: moneySources.name,
            amount: moneySources.amount
        });

        return newSource;
    } catch (error) {
        logger.error(`Error generating money source: ${error}`);
        throw error;
    }
}

export const getMoneySourceByUuid = async (uid: string, userUid: User['uid']) => {
    try{
        const moneySource = await db.query.moneySources.findFirst({
            where: {
                uid: uid,
                user: userUid
            }
        });

        if (!moneySource) {
            throw new Error('Money source not found');
        }
        
        return moneySource;
    } catch (error) {
        logger.error(`Error finding money source: ${error}`);
        throw error;
    }
}

export const editMoneySourceName = async (uid: string, newName: string, userUid: User['uid']): Promise<Partial<MoneySource> | undefined> => {
    try{    
        const sourceName = newName.trim().toUpperCase();
        const unauthorizedUser: MoneySource | undefined = await db.query.moneySources.findFirst({
            where: {
                uid: uid,
                user: userUid
            }
        });

        if (!unauthorizedUser) {
            throw new Error('You are not authorized to edit this money source');
        }


        const existingSource: MoneySource | undefined = await db.query.moneySources.findFirst({
            where: {
                name: sourceName,
                user: userUid
            }
        });

        if(existingSource){
            throw new Error('Money source with this name already exists');
        }
        
        const [updatedSource]: Partial<MoneySource>[] = await db.update(moneySources).set({
            name: sourceName,
            updatedAt: new Date()
        }).where(and(eq(moneySources.uid, uid), eq(moneySources.user, userUid))).returning({
            name: moneySources.name,
            uid: moneySources.uid,
            user: moneySources.user
        });

        return updatedSource;
    }catch (error) {
        logger.error(`Error editing money source name: ${error}`);
        throw error
    }
}

export const removeMoneySource = async (uid: string, userUid: User['uid']): Promise<Partial<MoneySource> | undefined> => {
    try {

        const toBeDeleted: MoneySource | undefined = await db.query.moneySources.findFirst({
            where: {
                uid: uid,
                user: userUid
            }
        });

        if (!toBeDeleted) {
            throw new Error('Money source not found');
        }

        const unauthorizedUser: MoneySource | undefined = await db.query.moneySources.findFirst({
            where: {
                uid: uid,
                user: userUid
            }
        });

        if (!unauthorizedUser) {
            throw new Error('You are not authorized to delete this money source');
        }


        const [deletedSource] : Partial<MoneySource>[] = await db.delete(moneySources).where(and(eq(moneySources.uid, uid), eq(moneySources.user, userUid))).returning({
            name: moneySources.name,
            uid: moneySources.uid,
            user: moneySources.user
        });
        
        return deletedSource;

    }catch (error) {
        logger.error(`Error removing money source: ${error}`);
        throw error;
    }
}

export const getMoneySourceBalance = async (userUid: string, moneySourceUid: string): Promise<string | undefined> => {
    try{
        const moneySource: Partial<MoneySource> | undefined = await db.query.moneySources.findFirst({
            where: {
                uid: moneySourceUid,
                user: userUid
            }
        });

        if (!moneySource) {
            throw new Error('Money source not found');
        }

        return moneySource.amount;
    }catch (error) {
        logger.error(`Error finding money source: ${error}`);
        throw error;
    }
}

export const updateMoneySourceBalance = async (tx: DatabaseTransaction, userUid: string, moneySource: string, amount: string, operation: 'add' | 'subtract'): Promise<Partial<MoneySource> | undefined> => {
    try{
        const source = await getMoneySourceBalance(userUid, moneySource);
        if (!source) {
            throw new Error('Money source not found');
        }

        let totalAmount: number;

        switch (operation) {
            case 'add':
                totalAmount = parseFloat(source) + parseFloat(amount);
                break;
            case 'subtract':
                totalAmount = parseFloat(source) - parseFloat(amount);
                break;
            default:
                throw new Error('Invalid operation');
        }

        const [updatedMoneySource] = await tx.update(moneySources)
        .set({
            amount: totalAmount.toString(),
            updatedAt: new Date()
        }).where(and(eq(moneySources.uid, moneySource), eq(moneySources.user, userUid))).returning({
            name: moneySources.name,
            amount: moneySources.amount
        });
        
        return updatedMoneySource;
    }catch (error) {
        logger.error(`Error updating money source balance: ${error}`);
        throw error;
    }
}