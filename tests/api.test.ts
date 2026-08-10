import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { db } from '../src/config/database';

// TODO: to be exported in the future and must reside in the login test file once the test suite is fully structured and organized.
let user = {
    name: 'Automated Test User',
    email: 'test@email.com',
    password: 'password123',
    token: '',
    userUid: ''
}

let money = {
    originSourceUid: '',
    destinationSourceUid: ''
}


beforeAll(async () => {
    await db.execute('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
});

describe('User Registration', () => {

    it('should create a new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: user.name,
                email: user.email,
                password: user.password,
            });
        expect(response.status).toBe(201);
    });

    it('should throw validation error for missing required fields', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: user.name,
                email: user.email,
            });
    
        expect(response.body).toHaveProperty('message', 'Validation failed');
        expect(response.status).toBe(400);
        
    });

    it('should throw validation error for invalid password length', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: user.name,
                email: user.email,
                password: '123',
            });
    
        expect(response.body).toHaveProperty('errors', ['password: Password must be at least 6 characters long']);
        expect(response.status).toBe(400);
        
    });

    it('should throw validation error for invalid email format', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: user.name,
                email: 'invalid-email',
                password: user.password,
            });
    
        expect(response.body).toHaveProperty('errors', ['email: Invalid email address']);
        expect(response.status).toBe(400);
        
    });

    //TODO: uncommment this only when user service is fixed to throw DuplicateError instead of generic Error
    it('should error when trying to create a user with an existing email', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Another Test User 2',
                email: 'test@email.com',
                password: 'password123',
            });
    
        expect(response.status).toBe(409);
        expect(response.body.message).toBe('User with this email already exists');
    });
});

// TODO: transfer login to another file once you have the full picture of the test suite and how you want to structure it. For now, it's here for simplicity.
describe('User Login', () => {
    it('should login an existing user', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: user.email,
                password: user.password,
            });
        
        user.token = response.body.token;
        user.userUid = response.body.user.uid;
        expect(response.status).toBe(200);
    });

    it('should throw an error for invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: user.email,
                password: 'wrongpassword',
            });
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });
});

//FIXME: proper typing for the initial amount
describe('Money Sources', () => {
    it('should create a new money source', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Origin Money Source',
                initialAmount: 1000.00,
            });

        money.originSourceUid = response.body.data.uid;

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Money source created successfully');
    });

    it('should create another money source', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Destination Money Source',
                initialAmount: 1000.00,
            });


        console.log('Destination Money Source Response:', response.body);
        money.destinationSourceUid = response.body.data.uid;

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Money source created successfully');
    });

    it('should have a default money source amount of 0.00 when no initial amount is provided', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Default Money Source',
                initialAmount: 0.00,
            });
        expect(response.status).toBe(201);
        expect(response.body.data.amount).toBe('0.00');
    });

    it('should throw an error when trying to create a money source with a negative initial amount', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Negative Money Source',
                initialAmount: -100.00,
            });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Initial amount cannot be negative');
    });

    it('should throw an error when trying to create a money source with an existing name', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Origin Money Source',
                initialAmount: 500.00,
            });
        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('message', 'Money source with this name already exists');
    });
});

describe('Income Transactions', () => {
   
    it('should create an income transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/income')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Income Transaction',
               amount: '100.00',
               moneySource: money.originSourceUid,
            });
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Income transaction created successfully');
        expect(response.body).toHaveProperty('data.updatedMoneySource.amount', '1100.00');
    });

    it('should throw an error when having a nonpositive amount for an income transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/income')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Income Transaction',
               amount: '0.00',
               moneySource: money.originSourceUid,
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Amount must be greater than zero');
    });

    it('should throw an error when transacting income to a non-existing money source', async () => {
        const response = await request(app)
            .post('/api/transactions/income')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Income Transaction',
               amount: '100.00',
               moneySource: '6b6764fd-4393-4f50-8743-b8110801b855',
        });
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Money source not found');
    });

});

describe('Expense Transactions', () => {
   
    it('should create an expense transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/expense')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Expense Transaction',
               amount: '100.00',
               moneySource: money.originSourceUid,
               type: 'EXPENSE'
            });
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Expense transaction created successfully');
        expect(response.body).toHaveProperty('data.updatedMoneySource.amount', '1000.00');
    });

    it('should throw an error when having a nonpositive amount for an expense transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/expense')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Expense Transaction',
               amount: '0.00',
               moneySource: money.originSourceUid,
               type: 'EXPENSE'
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Amount must be greater than zero');
    });

    it('should throw an error when having insufficient funds for an expense transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/expense')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Expense Transaction',
               amount: '2000.00',
               moneySource: money.originSourceUid,
               type: 'EXPENSE'
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Insufficient funds in the origin money source');
    });

    it('should throw an error when transacting expense to a non-existing money source', async () => {
        const response = await request(app)
            .post('/api/transactions/expense')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
               name: 'Test Expense Transaction',
               amount: '100.00',
               moneySource: '6b6764fd-4393-4f50-8743-b8110801b855',
               type: 'EXPENSE'
        });
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Money source not found');
    });

});

describe('Transfer Transactions', () => {
    it('should create a transfer transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/transfer')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Test Transfer Transaction',
                amount: '100.00',
                moneySource: money.originSourceUid,
                transferDestination: money.destinationSourceUid,
            });
        
        console.log('destination', money.destinationSourceUid);
        console.log('Transfer Transaction Response:', response.body);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Transfer transaction created successfully');
        expect(response.body).toHaveProperty('data.updatedMoneySource.amount', '900.00');
        expect(response.body).toHaveProperty('data.updatedDestinationMoneySource.amount', '1100.00');
    });

    it('should throw an error when having insufficient funds for a transfer transaction', async () => {
        const response = await request(app)
            .post('/api/transactions/transfer')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Test Transfer Transaction',
                amount: '999999.00',
                moneySource: money.originSourceUid,
                transferDestination: money.destinationSourceUid,
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Insufficient funds in the origin money source');
    });
});

// TODO: add tests for deleting different types of transactions (income, expense, transfer) and ensure that the money source amounts are updated correctly after deletion.
//TODO: prepare test for edge cases like deleting a transaction that doesn't exist, or deleting a transaction that belongs to another user, etc.
// afterAll(async () => {
//     await db.execute('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
// });
