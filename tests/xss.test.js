const request = require('supertest');
const app = require('../src/app');
const dbHandler = require('./db-handler');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

beforeAll(async () => {
    await dbHandler.connect();
});

afterEach(async () => {
    await dbHandler.clear();
});

afterAll(async () => {
    await dbHandler.close();
});

const generateToken = async (role = 'admin') => {
    const user = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Password123!',
        role: role
    });
    return jwt.sign({ id: user._id }, process.env.JWT_TOKEN);
};

describe('Security (XSS) Checks', () => {
    describe('Product Content Sanitization', () => {
        it('should sanitize script tags from product fields', async () => {
            const token = await generateToken('admin');
            const maliciousProduct = {
                name: 'Hacker <script>alert("xss")</script> Product',
                description: '<p>Malicious <script>alert("xss")</script> description</p>',
                price: 100,
                category: 'accessory',
                stock: 5
            };

            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(maliciousProduct);

            expect(res.statusCode).toEqual(201);


            const createdProduct = res.body.data;
            expect(createdProduct.name).not.toContain('<script>');
            expect(createdProduct.description).not.toContain('<script>');
        });
    });
});
