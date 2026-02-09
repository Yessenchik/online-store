/**
 * responseUtils.js
 * Standardized response utilities for consistency across controllers
 */

const sendError = (res, status, message, error) => {
  const payload = {
    success: false,
    message,
  };

  if (error) {
    payload.error = typeof error === 'string' ? error : error.message;
  }

  return res.status(status).json(payload);
};

/**
 * Send success response with named parameters
 * @param {Object} res - Express response object
 * @param {Object} options - Response options { data, message, extra, status }
 */
const sendSuccess = (res, { data, message, extra = null, status = 200 } = {}) => {
  const payload = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(extra && typeof extra === 'object' && extra),
  };

  return res.status(status).json(payload);
};

const getPagination = (page, limit) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, skip };
};

const buildPaginationMeta = (items, total, page, limit) => {
  return {
    count: items.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
};

const handleValidationError = (res, error, defaultMessage = 'Validation error') => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors)
      .map((e) => e.message)
      .join(', ');
    return sendError(res, 400, messages, error);
  }
  return sendError(res, 400, defaultMessage, error);
};

module.exports = {
  sendError,
  sendSuccess,
  getPagination,
  buildPaginationMeta,
  handleValidationError,
};
