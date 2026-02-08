const express = require("express");
const path = require("path");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");

const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const { requestLogger } = require("./utils/logger");

const app = express();

// Security HTTP headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:", "https://picsum.photos", "https://fastly.picsum.photos"],
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

/**
 * TODO: Missing:
 * 1. express-rate-limit (Rate limiting for auth/API routes)
 * 2. sanitize-html (For sanitizing HTML input in descriptions/reviews)
 * 3. Dedicated validation middleware layer
 */

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use(routes);

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
