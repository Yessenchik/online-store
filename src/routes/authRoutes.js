const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// TODO: Apply rate limiting to login and register routes
// TODO: Add dedicated validation middleware (e.g., using Joi or express-validator)

//public routes
router.post('/register', register);
router.post('/login', login);

//protected routes
router.get('/me', protect, getMe);

module.exports = router;