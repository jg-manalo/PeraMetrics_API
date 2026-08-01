import type {UserResource} from '../types/userresource';

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
        transactionsMade: user?.transactions?.length || 0,
        expenses: user?.transactions?.filter(flow => flow.category === 'EXPENSE').length || 0,
        income: user?.transactions?.filter(flow => flow.category === 'INCOME').length || 0,
        transfers: user?.transactions?.filter(flow => flow.category === 'TRANSFER').length || 0
    };
};