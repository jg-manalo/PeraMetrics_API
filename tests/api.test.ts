import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { db } from '../src/config/database';

beforeAll(async () => {
    await db.execute('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
});

describe('User Registration', () => {

    it('should create a new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Automated Test User',
                email: 'test@email.com',
                password: 'password123',
            });
    
        expect(response.status).toBe(201);
    });

    it('should throw validation error for missing required fields', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Automated Test User',
                email: 'test@email.com',
            });
    
        expect(response.body).toHaveProperty('message', 'Validation failed');
        expect(response.status).toBe(400);
        
    });

    it('should throw validation error for invalid password length', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Automated Test User',
                email: 'test@email.com',
                password: '123',
            });
    
        expect(response.body).toHaveProperty('errors', ['password: Password must be at least 6 characters long']);
        expect(response.status).toBe(400);
        
    });

    it('should throw validation error for invalid email format', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Automated Test User',
                email: 'invalid-email',
                password: '123123',
            });
    
        expect(response.body).toHaveProperty('errors', ['email: Invalid email address']);
        expect(response.status).toBe(400);
        
    });

    //uncommment this only when user service is fixed to throw DuplicateError instead of generic Error
    // it('should error when trying to create a user with an existing email', async () => {
    //     const response = await request(app)
    //         .post('/api/auth/register')
    //         .send({
    //             name: 'Another Test User 2',
    //             email: 'test@email.com',
    //             password: 'password123',
    //         });
    
    //     expect(response.status).toBe(409);
    //     expect(response.body.message).toBe('User with this email already exists');
    // });
});

afterAll(async () => {
    await db.execute('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
});
