const request = require('supertest');
const app = require('../src/app');
const dbHandler = require('./db-handler');
const Product = require('../src/models/Product');
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

const generateToken = async (role = 'user') => {
  const user = await User.create({
    name: role === 'admin' ? 'Admin User' : 'Test User',
    email: role === 'admin' ? 'admin@example.com' : 'test@example.com',
    password: 'Password123!',
    role: role,
  });
  return jwt.sign({ id: user._id }, process.env.JWT_TOKEN);
};

describe('Product Endpoints', () => {
  const productData = {
    name: 'Test Product',
    description: 'A great test product',
    price: 99.99,
    category: 'accessory',
    stock: 10,
    brand: 'TestBrand',
  };

  describe('POST /api/products', () => {
    it('should create a product if admin', async () => {
      const token = await generateToken('admin');
      const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(productData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.data).toHaveProperty('name', productData.name);
      expect(res.body.data).toHaveProperty('price', productData.price);
    });

    it('should not create a product if user is not admin', async () => {
      const token = await generateToken('user');
      const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(productData);

      expect(res.statusCode).toEqual(403);
    });

    it('should validate required fields', async () => {
      const token = await generateToken('admin');
      const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({}); // Empty body

      // Expect validation error (400)
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      await Product.create(productData);
      await Product.create({
        ...productData,
        name: 'Another Product',
        price: 150,
        is_active: true,
      });
    });

    it('should get all active products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by price', async () => {
      const res = await request(app).get('/api/products?minPrice=100');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].price).toBe(150);
    });
  });
});
