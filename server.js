require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

// TODO: Implement express-rate-limit
// TODO: Consider using sanitize-html for deeper input cleaning
// TODO: Consider adding a dedicated validation middleware (e.g., Joi or express-validator) for API input.

// TODO: Consider moving database connection and environment loading to a dedicated src/config directory
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

// TODO: Implement graceful shutdown for MongoDB connection and server
// process.on('SIGTERM', () => { ... });
// process.on('SIGINT', () => { ... });
