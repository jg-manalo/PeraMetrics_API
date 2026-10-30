import { faker } from '@faker-js/faker';
import { db } from '../config/database.js';
import { subscriptions } from '../models/subscriptions.js';

const durations = [
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'BIENNIAL',
] as const;

const seedSubscriptions = async (): Promise<void> => {
  const firstUser = await db.query.users.findFirst();

  if (!firstUser) {
    console.error('No users found in the database. Please seed users first.');
    return;
  }

  const firstMoneySource = await db.query.moneySources.findFirst({
    where: {
      user: firstUser.uid,
    },
  });

  if (!firstMoneySource) {
    console.error(
      'No money sources found for the user. Please seed money sources first.'
    );
    return;
  }

  const subscriptionNames = new Set<string>();
  const subscriptionData: (typeof subscriptions.$inferInsert)[] = [];

  for (let i = 0; i < 15; i++) {
    let name = faker.commerce.productName().toUpperCase();

    while (subscriptionNames.has(name)) {
      name = faker.commerce.productName().toUpperCase();
    }

    subscriptionNames.add(name);

    subscriptionData.push({
      name,
      user: firstUser.uid,
      startDate: faker.date.past({ years: 1 }),
      amount: faker.finance.amount({ min: 5, max: 100, dec: 2 }),
      duration: durations[i % durations.length],
      moneySource: firstMoneySource.uid,
    });
  }

  await db.insert(subscriptions).values(subscriptionData);
};

await seedSubscriptions();
