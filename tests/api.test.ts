import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import app from '../src/app.js';
import { db } from '../src/config/database.js';

// TODO: to be exported in the future and must reside in the login test file once the test suite is fully structured and organized.

let user = {
    name: 'Automated Test User',
    email: 'test@resend.dev',
    password: 'password123',
    token: '',
    userUid: ''
}

let snoopyUser = {
    name: 'Snoopy Test User',
    email: 'snoopdogg@email.com',
    password: 'password123',
    token: '',
    userUid: ''
}

let money = {
    originSourceUid: '',
    destinationSourceUid: ''
}

let transaction = {
    'income' : '',
    'expense' : '',
    'transfer' : '' 
};

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

    it('should create a new snoopy user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: snoopyUser.name,
                email: snoopyUser.email,
                password: snoopyUser.password,
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

    it('should error when trying to create a user with an existing email', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Another Test User 2',
                email: user.email,
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
        user.userUid = response.body.data.uid;
        expect(response.status).toBe(200);
    });

    it('should login the snoopy user', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: snoopyUser.email,
                password: snoopyUser.password,
            });
        
        snoopyUser.token = response.body.token;
        snoopyUser.userUid = response.body.data.uid;
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


describe('Money Sources', () => {
    it('should create a new money source', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: 'Origin Money Source',
                initialAmount: '1000.00',
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
                initialAmount: '1000.00',
            });

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
                initialAmount: '0.00',
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
                initialAmount: '-100.00',
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
                initialAmount: '500.00',
            });
        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('message', 'Money source with this name already exists');
    });

    it('should throw an error when trying to create a money source with an empty name', async () => {
        const response = await request(app)
            .post('/api/moneysources')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                name: '',
                initialAmount: '500.00',
            });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Validation failed');
        expect(response.body).toHaveProperty('errors', ['name: Name is required']);
    });

    it('should throw a forbidden error when trying to update the name of the money source of another user', async () => {
        const response = await request(app)
            .put(`/api/moneysources/${money.originSourceUid}`)
            .set('Authorization', `Bearer ${snoopyUser.token}`)
            .send({
                name: 'Updated Money Source Name',
            });
        
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'You are not authorized to edit this money source');
    });
    
    it('should throw a forbidden error when trying to delete a money source that belongs to another user', async () => {
        const response = await request(app)
            .delete(`/api/moneysources/${money.originSourceUid}`)
            .set('Authorization', `Bearer ${snoopyUser.token}`);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'You are not authorized to delete this money source');
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
        
        transaction.income = response.body.data.transaction.uid;
        
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
        
        transaction.expense = response.body.data.transaction.uid;

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
        
        transaction.transfer = response.body.data.transaction.uid;

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

describe('Transaction Deletion', () => {
    it('should delete an existing income transaction', async () => {
        const response = await request(app)
        .delete(`/api/transactions/delete/${transaction.income}`)
        .set('Authorization', `Bearer ${user.token}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Transaction deleted successfully');
    });
    
    it('should delete an existing expense transaction', async () => {
        const response = await request(app)
        .delete(`/api/transactions/delete/${transaction.expense}`)
        .set('Authorization', `Bearer ${user.token}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Transaction deleted successfully');
    });
    //The end goal should be origin money source amount = 1100.00, destination money source amount = 1000.00 after deletion
    
    it('should throw an error when trying to delete a transaction that does not exist', async () => {
        const response = await request(app)
            .delete(`/api/transactions/delete/${transaction.transfer}`)
            .set('Authorization', `Bearer ${snoopyUser.token}`);
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Transaction not found');
    });

});

describe('Transaction Deletion Edge Case', () => {
    
    it('should delete an existing money source', async () => {
        const response = await request(app)
            .delete(`/api/moneysources/${money.originSourceUid}`)
            .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Money source deleted successfully');
    });

    it('should delete an existing transaction even money source is missing', async () => {
        const response = await request(app)
            .delete(`/api/transactions/delete/${transaction.transfer}`)
            .set('Authorization', `Bearer ${user.token}`);

        console.log('Response body:', response.body); // Log the response body for debugging
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Transaction deleted successfully');
    });

});

afterAll(async () => {
    await request(app)
        .delete(`/api/users/${user.userUid}`)
        .set('Authorization', `Bearer ${user.token}`);
    await request(app)
        .delete(`/api/users/${snoopyUser.userUid}`)
        .set('Authorization', `Bearer ${snoopyUser.token}`);
});
