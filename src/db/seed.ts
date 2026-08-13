import { faker } from '@faker-js/faker';
import { users } from '../models/users.js';
import { moneySources } from '../models/moneysources.js';
import { transactions } from '../models/transactions.js';
import { hashPassword } from '../services/user.service.js';
import { db } from '../config/database.js';

const main = async () => {
  await db.execute(`TRUNCATE TABLE USERS RESTART IDENTITY CASCADE;`);

  const userData: (typeof users.$inferInsert)[] = [];
  const moneySourceData: (typeof moneySources.$inferInsert)[] = [];
  const transactionData: (typeof transactions.$inferInsert)[] = [];

  const userMoneySourcesMap = new Map<
    string,
    Array<{ uid: string; name: string; amount: string; user: string }>
  >();

  for (let i = 0; i < 10; i++) {
    const uid = faker.string.uuid();
    userData.push({
      uid,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: await hashPassword('password123'),
    });

    const sourcesForUser = [];

    for (let j = 0; j < 2; j++) {
      sourcesForUser.push({
        uid: faker.string.uuid(),
        name: faker.company.name(),
        amount: '100.00',
        user: uid,
      });
    }

    userMoneySourcesMap.set(uid, sourcesForUser);
  }

  for (const [userId, sources] of userMoneySourcesMap.entries()) {
    for (const source of sources) {
      for (let k = 0; k < 25; k++) {
        const type = faker.helpers.arrayElement([
          'EXPENSE',
          'INCOME',
          'TRANSFER',
        ]);
        const amount = Number(faker.finance.amount({ min: 1, max: 5, dec: 2 }));

        if (type === 'TRANSFER') {
          const availableTargets = sources.filter((s) => s.uid !== source.uid);

          if (availableTargets.length > 0) {
            const targetSource = faker.helpers.arrayElement(availableTargets);

            source.amount = (parseFloat(source.amount) - amount).toFixed(2);
            targetSource.amount = (
              parseFloat(targetSource.amount) + amount
            ).toFixed(2);

            transactionData.push({
              uid: faker.string.uuid(),
              name: `Transfer to ${targetSource.uid.slice(0, 8)}`,
              category: 'TRANSFER',
              amount: amount.toFixed(2),
              moneySource: source.uid,
              transferDestination: targetSource.uid,
              user: userId,
              date: faker.date.recent({ days: 30 }).toISOString(),
            });
          } else {
            source.amount = (parseFloat(source.amount) - amount).toFixed(2);
            transactionData.push({
              uid: faker.string.uuid(),
              name: faker.finance.transactionDescription(),
              category: 'EXPENSE',
              amount: amount.toFixed(2),
              moneySource: source.uid,
              user: userId,
              date: faker.date.recent({ days: 30 }).toISOString(),
            });
          }
        } else if (type === 'EXPENSE') {
          source.amount = (parseFloat(source.amount) - amount).toFixed(2);
          transactionData.push({
            uid: faker.string.uuid(),
            name: faker.finance.transactionDescription(),
            category: 'EXPENSE',
            amount: amount.toFixed(2),
            moneySource: source.uid,
            user: userId,
            date: faker.date.recent({ days: 30 }).toISOString(),
          });
        } else {
          source.amount = (parseFloat(source.amount) + amount).toFixed(2);
          transactionData.push({
            uid: faker.string.uuid(),
            name: faker.finance.transactionDescription(),
            category: 'INCOME',
            amount: amount.toFixed(2),
            moneySource: source.uid,
            user: userId,
            date: faker.date.recent({ days: 30 }).toISOString(),
          });
        }
      }
    }

    moneySourceData.push(...sources);
  }

  await db.insert(users).values(userData);
  await db.insert(moneySources).values(moneySourceData);
  await db.insert(transactions).values(transactionData);
  console.log('Seeding 10 users...');
  console.log('Seeding 2 money source for each user...');
  console.log('Seeding 50 transactions for each user...');
};

main();
