// use this only if there are existing seed data in the database that have users
import { db } from '../config/database.js';
import { faker } from '@faker-js/faker';
import type { MoneySource } from '../types/moneysource.js';
import { moneySources } from '../models/moneysources.js';

const seedMoneySources = async (): Promise<void> => {
  const moneySourcesData: MoneySource[] = [];
  const firstUser = await db.query.users.findFirst();
  for (let i = 0; i < 15; i++) {
    const moneySource: MoneySource = {
      name: faker.finance.accountName().toUpperCase(),
      user: firstUser?.uid || '',
      amount: '0.00',
    };
    moneySourcesData.push(moneySource);
  }

  for (const moneySource of moneySourcesData) {
    await db.insert(moneySources).values(moneySource);
  }
};

await seedMoneySources();
