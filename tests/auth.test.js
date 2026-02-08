const request = require('supertest');
const app = require('../src/app');
const dbHandler = require('./db-handler');

beforeAll(async () => {
    await dbHandler.connect();
});

afterEach(async () => {
    await dbHandler.clear();
});

afterAll(async () => {
    await dbHandler.close();
});

describe('Auth Endpoints', () => {
    const user = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        phone: '1234567890'
    };

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(user);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user).toHaveProperty('email', user.email);
            expect(res.body.data.user).toHaveProperty('name', user.name);
            expect(res.body.data.user).not.toHaveProperty('password');
        });

        it('should not register a user with duplicate email', async () => {
            await request(app).post('/api/auth/register').send(user);

            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...user, name: 'Other User' });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/already exists/i);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send(user);
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password: user.password,
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('token');
        });

        it('should not login with invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password: 'WrongPassword123!',
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('success', false);
        });
    });

    describe('GET /api/auth/me', () => {
        let token;

        beforeEach(async () => {
            const res = await request(app).post('/api/auth/register').send(user);
            token = res.body.data.token;
        });

        it('should get current user profile', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('email', user.email);
        });

        it('should fail without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.statusCode).toEqual(401);
        });
    });
});
