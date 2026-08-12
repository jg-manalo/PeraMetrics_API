import {faker} from '@faker-js/faker';
import {users} from '../models/users.js';
import {moneySources} from '../models/moneysources.js';
import {transactions} from '../models/transactions.js';
import {hashPassword} from '../services/user.service.js';

import  {db} from '../config/database.js';

const main = async () => {

    await db.execute(`TRUNCATE TABLE USERS RESTART IDENTITY CASCADE ;`);

    const userData: typeof users.$inferInsert[] = []
    const moneySourceData: typeof moneySources.$inferInsert[] = []
    const transactionData: typeof transactions.$inferInsert[] = []

    for(let i = 0; i < 20; i++) {
        const uid = faker.string.uuid();
        userData.push({
            uid,
            name: faker.person.fullName(),
            email: faker.internet.email(),
            password: await hashPassword('password123'),
        });

        for (let j = 0; j < 3; j++) {
            const moneySourceUid = faker.string.uuid();
            let currentMoneySourceAmount = Number('10000.00');
            const currentMoneySource = {
                uid: moneySourceUid,
                name: faker.company.name(),
                amount: currentMoneySourceAmount.toFixed(2),
                user: uid,
            };
            moneySourceData.push(currentMoneySource);
            for (let k = 0; k < 3; k++) {
                const type = faker.helpers.arrayElement(['EXPENSE', 'INCOME']);
                const amount = Number(type === 'EXPENSE' ? faker.finance.amount({ min: 10, max: 1000, dec: 2 }) : faker.finance.amount({ min: 100, max: 5000, dec: 2 }));
                const amountDelta = type === 'EXPENSE' ? -amount : amount;
                currentMoneySourceAmount += amountDelta;
                currentMoneySource.amount = currentMoneySourceAmount.toFixed(2);
            
                transactionData.push({
                    uid: faker.string.uuid(),
                    name: faker.finance.transactionDescription(),
                    category: type,
                    amount: amount.toFixed(2),
                    moneySource: moneySourceUid,
                    user: uid,
                    date: faker.date.recent({ days: 30 }).toISOString()
                });
            }
        }

        
    }

    await db.insert(users).values(userData);
    await db.insert(moneySources).values(moneySourceData);
    await db.insert(transactions).values(transactionData);
    console.log('Seeding completed.');
}

main();