import {db} from '../config/database';
import {transactions} from '../models/transactions';
import {eq, and} from 'drizzle-orm';
import {getMoneySourceBalance, updateMoneySourceBalance} from './moneysource.service';
import {NotFoundError, ValueError} from '../errors/errors';
import type { Transaction } from '../types/transaction';
import type {MoneySource} from '../types/moneysource';
import type { TransactionQuery } from '../types/queries';
import logger from '../config/logger';

type TransactionReport = Transaction & {
    source: {
        name: string;
    } | null;

    transferTo: {
        name: string;
    } | null;
}

type TransactionInOutManipulation = {
    transaction: Transaction | undefined;
    updatedMoneySource: Partial<MoneySource> | undefined;
}

type TransactionTransferManipulation = Pick<TransactionInOutManipulation, 'updatedMoneySource'> & {
    transaction: Partial<Transaction> | undefined;
    updatedDestinationMoneySource: Partial<MoneySource> | undefined;
}

export const fetchTransactions = async (userUid: string, filters: TransactionQuery): Promise<Transaction[]> => {
    try{
        const page: number = filters.page ?? 1;
        const order: 'asc' | 'desc' = filters.orderBy ?? 'desc';
        const pageLimit: number = 10;
        const offset: number = (page - 1) * pageLimit;
        const categoryFilter: Transaction['category'] | undefined = filters.category;

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

        return results;
    } catch (error) {
        logger.error(`Error fetching transactions: ${error}`);
        throw error;
    }
}

export const generateReport = async (userUid: string, startDate: string, endDate: string): Promise<TransactionReport[]> => {
    try{

        const report = await db.query.transactions.findMany({
            where: {
                user: userUid,
                date: {
                    gte: new Date(startDate).toISOString(),
                    lte: new Date(endDate).toISOString()
                }
            },
            orderBy: {
                date: 'desc'
            },
            with: {
                source: {
                    columns: {
                        name: true
                    }
                },
                transferTo: {
                    columns: {
                        name: true
                    }
                }
            }
    
        });

        if (report.length === 0) {
            throw new NotFoundError('No transactions found for the specified period');
        }

        return report;
    } catch (error) {
        logger.error(`Error generating transaction report: ${error}`);
        throw error;
    }
}

export const storeIncome = async (userUid: string, name: string, amount: string, moneySource: string): Promise<TransactionInOutManipulation> => {
    try{
        const result = await db.transaction(async (tx) => {
            
            ensuresAmountIsPositive(amount);

            const updatedMoneySource = await updateMoneySourceBalance(tx, userUid, moneySource, amount, 'add');
            
            const [transaction]: Transaction[] = await tx.insert(transactions)
            .values({
                user: userUid,
                name: name,
                amount: amount,
                moneySource: moneySource,
                category: 'INCOME',
                date: new Date().toISOString()
            }).returning({
                id: transactions.id,
                uid: transactions.uid,
                name: transactions.name,
                amount: transactions.amount,
                date: transactions.date,
                category: transactions.category,
                moneySource: transactions.moneySource
            });
            return {
                transaction,
                updatedMoneySource
            }
        });

        return result;
    }catch (error) {
        logger.error(`Error storing income: ${error}`);
        throw error;
    }
}

export const storeExpense = async (userUid: string, name: string, amount: string, moneySource: string): Promise<TransactionInOutManipulation> => {
    try{
        const result = await db.transaction(async (tx) => {

            const currentBalance = await getMoneySourceBalance(userUid, moneySource);
            
            if (!currentBalance) {
                throw new NotFoundError('Money source not found');
            }
            
            ensuresAmountIsPositive(amount);
            ensuresItIsAfford(currentBalance, amount);

            const updatedMoneySource = await updateMoneySourceBalance(tx, userUid, moneySource, amount, 'subtract');
            
            const [transaction]: Transaction[] = await tx.insert(transactions)
            .values({
                user: userUid,
                name: name,
                amount: amount,
                moneySource: moneySource,
                category: 'EXPENSE',
                date: new Date().toISOString()
            }).returning({
                id: transactions.id,
                uid: transactions.uid,
                name: transactions.name,
                amount: transactions.amount,
                date: transactions.date,
                category: transactions.category,
                moneySource: transactions.moneySource
            });


            return {
                transaction,
                updatedMoneySource
            }
        });

        return result;

    }catch (error) {
        logger.error(`Error storing expense: ${error}`);
        throw error;
    }
}

export const storeTransfer = async (userUid: string, name: string, amount: string, originMoneySource: string, destinationMoneySource: string | undefined | null): Promise<TransactionTransferManipulation> => {
    try{
        const result = await db.transaction(async (tx) => {
        
            const originBalance = await getMoneySourceBalance(userUid, originMoneySource);

            if (!destinationMoneySource) {
                throw new NotFoundError('Transfer destination not found');
            }
            
            if (originBalance) {
                ensuresItIsAfford(originBalance, amount);
            }
            
            ensuresAmountIsPositive(amount);

            await getMoneySourceBalance(userUid, destinationMoneySource);
           
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

export const removeTransaction = async (userUid: string, transactionUid: string): Promise<void> => {
    try {
        const result = await db.transaction(async (tx) => {
            const [existingTransaction] = await tx.select().from(transactions).where(and(eq(transactions.uid, transactionUid), eq(transactions.user, userUid)));

            if (!existingTransaction) {
                throw new NotFoundError('Transaction not found');
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
                    //TODO: Handle unknown category case, or throw it to the general catch block to be handled by the middleware
                    throw new Error('Unknown transaction category');
            } 
        });

        return result;
    } catch (error) {
        logger.error(`Error removing transaction: ${error}`);
        throw error;
    }
}

const ensuresAmountIsPositive = (amount: string): void => {
    if (parseFloat(amount) <= 0) {
        throw new ValueError('Amount must be greater than zero');
    }
}

const ensuresItIsAfford = (currentBalance: string, amount: string): void => {
    if (parseFloat(currentBalance) < parseFloat(amount)) {
        throw new ValueError('Insufficient funds in the origin money source');
    }
}