const sanitizeHtml = require('sanitize-html');

/**
 * Middleware to sanitize HTML content in request body
 * @param {string[]} fields - Fields to sanitize
 */
const sanitizeBody = (fields) => {
  return (req, res, next) => {
    if (req.body) {
      fields.forEach((field) => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = sanitizeHtml(req.body[field], {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              '*': ['class', 'style'],
            },
          });
        }
      });
    }
    next();
  };
};

module.exports = {
  sanitizeBody,
};
