const { body, validationResult } = require('express-validator');
const { sendError } = require('../controllers/responseUtils');

const validators = {
  email: {
    regex: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
    message: 'Please provide a valid email',
  },
  phone: {
    // Validates +7701... or 8701... or 7701... (10-11 digits)
    regex: /^(?:\+7|8|7)(7\d{9})$/,
    message: 'Please provide a valid Kazakhstan phone number (e.g., +7 701 123 4567)',
  },
};

const constraints = {
  minName: 2,
  minPassword: 6,
  minDescription: 10,
  maxComment: 1000,
  maxTitle: 100,
  maxNotes: 500,
};

/**
 * Middleware to validate request and handle errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map((err) => extractedErrors.push({ [err.path]: err.msg }));

  return sendError(res, 400, 'Validation failed', { details: extractedErrors });
};

/**
 * Auth validation rules
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: constraints.minName })
    .withMessage(`Name must be at least ${constraints.minName} characters long`),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .matches(validators.email.regex)
    .withMessage(validators.email.message)
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: constraints.minPassword })
    .withMessage(`Password must be at least ${constraints.minPassword} characters long`),
  validate,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .matches(validators.email.regex)
    .withMessage(validators.email.message)
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

/**
 * Product validation rules
 */
const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3 })
    .withMessage('Product name must be at least 3 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ min: constraints.minDescription })
    .withMessage(`Description must be at least ${constraints.minDescription} characters`),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['phone-case', 'laptop-case', 'tablet-case', 'watch-case', 'accessory'])
    .withMessage('Invalid category'),
  body('price').notEmpty().withMessage('Price is required').isFloat({ min: 0 }).withMessage('Price cannot be negative'),
  body('stock').notEmpty().withMessage('Stock is required').isInt({ min: 0 }).withMessage('Stock cannot be negative'),
  validate,
];

/**
 * Review validation rules
 */
const reviewValidation = [
  body('product').notEmpty().withMessage('Product ID is required').isMongoId().withMessage('Invalid product ID'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: constraints.maxTitle })
    .withMessage(`Title cannot exceed ${constraints.maxTitle} characters`),
  body('comment')
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ min: constraints.minDescription, max: constraints.maxComment })
    .withMessage(`Comment must be between ${constraints.minDescription} and ${constraints.maxComment} characters`),
  validate,
];

/**
 * Order validation rules
 */
const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  body('shippingAddress.name').trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Shipping street is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('Shipping city is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Shipping country is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Shipping phone is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['credit-card', 'paypal', 'kaspi-qr', 'cash-on-delivery'])
    .withMessage('Invalid payment method'),
  body('pricing').notEmpty().withMessage('Pricing details are required'),
  body('pricing.total')
    .notEmpty()
    .withMessage('Total price is required')
    .isFloat({ min: 0 })
    .withMessage('Total cannot be negative'),
  validate,
];

module.exports = {
  validators,
  constraints,
  registerValidation,
  loginValidation,
  productValidation,
  reviewValidation,
  orderValidation,
};
