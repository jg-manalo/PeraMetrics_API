import type { Transaction } from '../types/transaction';
import {db} from '../config/database';
import {transactions} from '../models/transactions';
import logger from '../config/logger';
import {eq, and} from 'drizzle-orm';
import {getMoneySourceBalance, updateMoneySourceBalance} from './moneysource.service';
import type { QueryFilters } from '../types/queryfilters';

export const fetchTransactions = async (userUid: string, filters: QueryFilters) => {
    try{

        const page: number = filters.page ?? 1;
        const order: 'asc' | 'desc' = filters.orderBy ?? 'desc';
        const pageLimit: number = 10;
        const offset: number = (page - 1) * pageLimit;
        const categoryFilter: 'INCOME' | 'EXPENSE' | 'TRANSFER' | undefined = filters.category;

        const results = await db.query.transactions.findMany({
            where: {
                user: userUid,
                category: categoryFilter ? categoryFilter : undefined
            },
            orderBy: {
                createdAt: order
            },
            limit: pageLimit,
            offset: offset
    
        });
    
        if (!results){
            throw new Error('No transactions history found');
        }
        return results;
    } catch (error) {
        logger.error(`Error fetching transactions for user ${userUid}: ${error}`);
        throw error;
    }
}

export const storeIncome = async (userUid: string, name: string, amount: string, moneySource: string) => {
    try{
        const result = await db.transaction(async (tx) => {
            
            if(parseFloat(amount) <= 0){
                throw new Error('Amount must be greater than zero');
            }

            const [transaction]: Partial<Transaction>[] = await tx.insert(transactions)
            .values({
                user: userUid,
                name: name,
                amount: amount.toString(),
                moneySource: moneySource,
                category: 'INCOME',
                date: new Date().toISOString()
            }).returning({
                uid: transactions.uid,
                name: transactions.name,
                amount: transactions.amount,
                date: transactions.date,
                category: transactions.category,
                moneySource: transactions.moneySource
            });

            const updatedMoneySource = await updateMoneySourceBalance(tx, userUid, moneySource, amount, 'add');

            return {
                transaction,
                updatedMoneySource
            }
        });

        return result;
    }catch (error) {
        logger.error(`Error storing income transaction: ${error}`);
        throw error;
    }
}

export const storeExpense = async (userUid: string, name: string, amount: string, moneySource: string) => {
    try{
        const result = await db.transaction(async (tx) => {

            const currentBalance = await getMoneySourceBalance(userUid, moneySource);

            if (!currentBalance) {
                throw new Error('Money source not found');
            }

            if (parseFloat(currentBalance) < parseFloat(amount)) {
                throw new Error('Insufficient funds in the money source');
            }

            if (parseFloat(amount) <= 0){
                throw new Error('Amount must be greater than zero');
            }

            
            const [transaction]: Partial<Transaction>[] = await tx.insert(transactions)
            .values({
                user: userUid,
                name: name,
                amount: amount.toString(),
                moneySource: moneySource,
                category: 'EXPENSE',
                date: new Date().toISOString()
            }).returning({
                uid: transactions.uid,
                name: transactions.name,
                amount: transactions.amount,
                date: transactions.date,
                category: transactions.category,
                moneySource: transactions.moneySource
            });

            const updatedMoneySource = await updateMoneySourceBalance(tx, userUid, moneySource, amount, 'subtract');


            return {
                transaction,
                updatedMoneySource
            }
        });

        return result;

    }catch (error) {
        logger.error(`Error storing expense transaction: ${error}`);
        throw error;
    }
}

export const storeTransfer = async (userUid: string, name: string, amount: string, originMoneySource: string, destinationMoneySource: string) => {
    try{
        const result = await db.transaction(async (tx) => {
        
            const originBalance = await getMoneySourceBalance(userUid, originMoneySource);

            if (!originBalance) {
                throw new Error('Origin money source not found');
            }

            if (parseFloat(amount) <= 0){
                throw new Error('Amount must be greater than zero');
            }

            if (parseFloat(originBalance) < parseFloat(amount)) {
                throw new Error('Insufficient funds in the origin money source');
            }

            const destinationBalance = await getMoneySourceBalance(userUid, destinationMoneySource);

            if (!destinationBalance) {
                throw new Error('Destination money source not found');
            }

           
            const [transaction]: Partial<Transaction>[] = await tx.insert(transactions)
            .values({
                user: userUid,
                name: name,
                amount: amount.toString(),
                moneySource: originMoneySource,
                transferDestination: destinationMoneySource,
                category: 'TRANSFER',
                date: new Date().toISOString()
            }).returning({
                uid: transactions.uid,
                name: transactions.name,
                amount: transactions.amount,
                date: transactions.date,
                category: transactions.category,
                moneySource: transactions.moneySource,
                transferDestination: transactions.transferDestination
            });

            const updatedMoneySource = await updateMoneySourceBalance(tx, userUid, originMoneySource, amount, 'subtract');
            const updatedDestinationMoneySource = await updateMoneySourceBalance(tx, userUid, destinationMoneySource, amount, 'add');

            return {
                transaction,
                updatedMoneySource,
                updatedDestinationMoneySource
            }
        });

        return result;
    } catch (error) {
        logger.error(`Error storing transfer transaction: ${error}`);
        throw error;
    }
}

export const removeTransaction = async (userUid: string, transactionUid: string) => {
    try {
        const result = await db.transaction(async (tx) => {
            const [existingTransaction] = await tx.select().from(transactions).where(and(eq(transactions.uid, transactionUid), eq(transactions.user, userUid)));

            if (!existingTransaction) {
                throw new Error('Transaction not found');
            }

            switch (existingTransaction.category) {
                case 'INCOME':
                    const currentIncomeBalanceExists = await getMoneySourceBalance(userUid, existingTransaction.moneySource);
                    
                    if (currentIncomeBalanceExists) {
                        await updateMoneySourceBalance(tx, userUid, existingTransaction.moneySource, existingTransaction.amount, 'subtract');
                    }
                    
                    await tx.delete(transactions).where(and(eq(transactions.uid, transactionUid), eq(transactions.user, userUid)));
                    break;

                case 'EXPENSE':
                    const currentExpenseBalanceExists = await getMoneySourceBalance(userUid, existingTransaction.moneySource);

                    if (currentExpenseBalanceExists) {
                        await updateMoneySourceBalance(tx, userUid, existingTransaction.moneySource, existingTransaction.amount, 'add');
                    }
                    
                    await tx.delete(transactions).where(and(eq(transactions.uid, transactionUid), eq(transactions.user, userUid)));
                    break;
                
                case 'TRANSFER':
                    const currentOriginBalanceExists = await getMoneySourceBalance(userUid, existingTransaction.moneySource);
                    const currentDestinationBalanceExists = await getMoneySourceBalance(userUid, existingTransaction.transferDestination!);
             
                    if (currentOriginBalanceExists && currentDestinationBalanceExists) {
                        await updateMoneySourceBalance(tx, userUid, existingTransaction.moneySource, existingTransaction.amount, 'add');
                        await updateMoneySourceBalance(tx, userUid, existingTransaction.transferDestination!, existingTransaction.amount, 'subtract');
                    }

                    await tx.delete(transactions).where(and(eq(transactions.uid, transactionUid), eq(transactions.user, userUid)));

                    break;
                
                default:
                    throw new Error('Unknown transaction category');
            } 
        });

        return result;
    } catch (error) {
        logger.error(`Error removing transaction: ${error}`);
        throw error;
    }
}