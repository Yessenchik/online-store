const express = require('express');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { requestLogger } = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://picsum.photos',
          'https://fastly.picsum.photos',
          'https://encrypted-tbn0.gstatic.com',
          'https://via.placeholder.com',
          'https://m.media-amazon.com', // Amazon Media
          'https://images-na.ssl-images-amazon.com', // Amazon Static
          'https://www.dropguys.com',
          'https://capraleather.com', // Capra Leather
          'https://media.tatacroma.com', // Croma
          'https://my-apple-store.ru', // Apple Store RU
          'https://www.esrtech.com', // ESR Tech
          'https://i5.walmartimages.com', // Walmart
          'https://images-cdn.ubuy.co.in', // Ubuy
          'https://images.mobilefun.co.uk', // MobileFun
          'https://komodoty.com', // Komodoty
          'https://image-cdn.moss.com.hk', // Moss HK
          'https://ezeller.com', // Ezeller
          'https://ezeller.com/wp-content/uploads/',
        ],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Request logging middleware
app.use(requestLogger);

// Rate limiting
app.use('/api', apiLimiter);

// Serve static files with automatic extension resolution (.html, .htm)
const htmlDir = path.join(__dirname, '../public');
app.use(
  express.static(htmlDir, {
    extensions: ['html', 'htm'], // Automatically tries to match requests to .html or .htm files
  })
);

// Routes
app.use(routes);

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
