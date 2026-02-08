const express = require('express');
const path = require('path');
const router = express.Router();

const sendView = (viewName) => (req, res) => res.sendFile(path.join(__dirname, '../../views', viewName));

router.get('/', sendView('index.html'));
router.get('/login.html', sendView('login.html'));
router.get('/dashboard.html', sendView('dashboard.html'));
router.get('/products.html', sendView('products.html'));
router.get('/cart.html', sendView('cart.html'));
router.get('/product.html', sendView('product.html'));
router.get('/admin.html', sendView('admin.html'));

module.exports = router;
