import type {User} from '../types/user';
import type {Transaction} from '../types/transaction';
import type {MoneySource} from '../types/moneysource';

export type UserResource = Omit<User, 'password' | 'id'> & {
    moneySources?: MoneySource[];
    transactions?: Transaction[];
};

export const userResource = (user: UserResource | undefined) : UserResource | undefined => {
   
    if (!user) {
        return undefined;
    }
    
    return {
        uid: user.uid,
        name: user.name,
        email: user.email,
        moneySources: user?.moneySources?.map(income => ({
            name: income.name,
            amount: income.amount.toString()
        })),
        transactions: user?.transactions
    };
};