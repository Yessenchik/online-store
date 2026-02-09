const rateLimit = require('express-rate-limit');
const { sendError } = require('../controllers/responseUtils');

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Standard API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => isTestEnv,
  handler: (req, res, next, options) => {
    return sendError(res, options.statusCode, options.message);
  },
});

/**
 * Stricter rate limiter for auth routes
 * Limits each IP to 5 login/register attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again after 15 minutes',
  skip: () => isTestEnv,
  handler: (req, res, next, options) => {
    return sendError(res, options.statusCode, options.message);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
