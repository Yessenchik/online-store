const express = require('express');
const router = express.Router();
const { getProductReviews, createReview, updateReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/sanitizer');
const { reviewValidation } = require('../middleware/validator');

//public route for getting reviews by product
router.get('/products/:productId', getProductReviews);

//protected routes
router.post('/', protect, reviewValidation, sanitizeBody(['comment']), createReview);
router.put('/:id', protect, reviewValidation, sanitizeBody(['comment']), updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
