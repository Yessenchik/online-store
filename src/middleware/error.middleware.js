/**
 * Centralized Error Handler Middleware
 * Handles all errors and returns appropriate HTTP responses
 */

'use strict';

const { logger } = require('../utils/logger');

/**
 * HTTP Status Code definitions
 */
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Determines if error is operational (expected) vs programming error
 * @param {Error} err - The error object
 * @returns {boolean} True if operational error
 */
const isOperationalError = (err) => {
  return err.isOperational === true;
};

/**
 * Gets the appropriate status code for an error
 * @param {Error} err - The error object
 * @returns {number} HTTP status code
 */
const getStatusCode = (err) => {
  if (err.statusCode) {
    return err.statusCode;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return HTTP_STATUS.BAD_REQUEST;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return HTTP_STATUS.UNAUTHORIZED;
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return HTTP_STATUS.CONFLICT;
  }

  // MongoDB validation error
  if (err.name === 'MongoServerError') {
    return HTTP_STATUS.BAD_REQUEST;
  }

  // MongoDB cast error (invalid ObjectId)
  if (err.name === 'BSONError' || err.message?.includes('ObjectId')) {
    return HTTP_STATUS.BAD_REQUEST;
  }

  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
};

/**
 * Gets a user-friendly message for known error types
 * @param {Error} err - The error object
 * @returns {string} User-friendly error message
 */
const getUserFriendlyMessage = (err) => {
  // MongoDB duplicate key error
  if (err.code === 11000) {
    // Extract the field name from the error
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return `A record with this ${field} already exists`;
  }

  // MongoDB cast/validation errors
  if (err.name === 'BSONError' || err.message?.includes('ObjectId')) {
    return 'Invalid ID format';
  }

  if (err.name === 'MongoServerError') {
    return 'Database operation failed';
  }

  if (err.name === 'JsonWebTokenError') {
    return 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    return 'Authentication token has expired';
  }

  return null; // Return null to indicate no special handling
};

/**
 * Main error handler middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = getStatusCode(err);
  const isOperational = isOperationalError(err);

  // Log the error with full details (server-side only)
  const logData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorMessage: err.message,
    isOperational,
    userId: req.user?.id,
  };

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR || !isOperational) {
    // Log full stack for server errors or programming errors
    logger.error('Error occurred', {
      ...logData,
      stack: err.stack,
      errorCode: err.code,
      errorName: err.name,
    });
  } else if (statusCode >= HTTP_STATUS.BAD_REQUEST) {
    // Log warning for client errors
    logger.warn('Client error occurred', logData);
  }

  // Determine the message to show to the client
  let responseMessage;

  // Check for user-friendly message first
  const friendlyMessage = getUserFriendlyMessage(err);

  if (friendlyMessage) {
    responseMessage = friendlyMessage;
  } else if (isOperational) {
    // For operational errors, we can show the specific message
    responseMessage = err.message;
  } else {
    // For programming/unexpected errors, ALWAYS mask the message
    // to avoid leaking system details to the client
    responseMessage = 'An unexpected error occurred. Please try again later.';

    // In production, be even more generic for 500 errors
    if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
      responseMessage = 'Internal Server Error';
    }
  }

  // Build the response
  const response = {
    success: false,
    message: responseMessage,
  };

  // Include validation details if available and it's a client error
  if (err.details && statusCode < 500) {
    response.details = err.details;
  }

  // Include stack trace ONLY in development mode and ONLY for non-production
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Creates an operational error with a specific status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Operational error
 */
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

module.exports = {
  errorHandler,
  notFoundHandler,
  createError,
  HTTP_STATUS,
};
