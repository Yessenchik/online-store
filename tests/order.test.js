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
    addresses: [
      {
        street: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        phone: '1234567890',
      },
    ],
  });
  return { token: jwt.sign({ id: user._id }, process.env.JWT_TOKEN), userId: user._id };
};

describe('Order Endpoints', () => {
  let token;
  let productId;

  beforeEach(async () => {
    const { token: t } = await generateToken();
    token = t;

    const product = await Product.create({
      name: 'Test Product',
      description: 'A great test product',
      price: 100,
      category: 'accessory',
      stock: 10,
      brand: 'TestBrand',
    });
    productId = product._id;
  });

  describe('POST /api/orders', () => {
    it('should create an order', async () => {
      const orderData = {
        items: [{ product: productId, quantity: 2 }],
        shippingAddress: {
          name: 'Test Name',
          street: '123 Test St',
          city: 'Test City',
          country: 'Test Country',
          phone: '1234567890',
        },
        paymentMethod: 'credit-card',
        pricing: {
          subtotal: 200,
          tax: 20,
          shipping: 10,
          total: 230,
        },
      };

      const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send(orderData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.pricing.total).toBe(230);

      // Check stock reduction
      const product = await Product.findById(productId);
      expect(product.stock).toBe(8); // 10 - 2
    });

    it('should fail if insufficient stock', async () => {
      const orderData = {
        items: [{ product: productId, quantity: 20 }], // > 10
        shippingAddress: {
          name: 'Test Name',
          street: 'Maples',
          city: 'City',
          country: 'Country',
          phone: '123',
        },
        paymentMethod: 'credit-card',
        pricing: { subtotal: 2000, total: 2000 },
      };

      const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send(orderData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Insufficient stock/);
    });
  });
});
