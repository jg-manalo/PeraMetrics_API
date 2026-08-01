import type {User} from './user';
import type { MoneySource } from './moneysource';
import { Transaction } from './transaction';

export type UserResource = Omit<User, 'password' | 'id'> & {
    moneySources?: MoneySource[];
    transactions?: Transaction[];
    transactionsMade?: number;
    expenses?: number,
    income?: number,
    transfers?: number
};
