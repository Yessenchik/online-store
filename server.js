require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { sendError } = require('./src/controllers/responseUtils');

//import routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const userRoutes = require('./src/routes/userRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const app = express();

//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serve static files
app.use(express.static(path.join(__dirname, 'public')));

//mongodb connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

//api routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

//serve html pages
const sendView = (viewName) => (req, res) => res.sendFile(path.join(__dirname, `views/${viewName}`));

app.get('/', sendView('index.html'));
app.get('/login.html', sendView('login.html'));
app.get('/dashboard.html', sendView('dashboard.html'));
app.get('/products.html', sendView('products.html'));
app.get('/cart.html', sendView('cart.html'));
app.get('/product.html', sendView('product.html'));
app.get('/admin.html', sendView('admin.html'));

//error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    return sendError(res, err.status || 500, err.message || 'Internal Server Error', err);
});

//404 handler
app.use((req, res) => {
    return sendError(res, 404, 'Route not found');
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;