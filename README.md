# Cases Store - Full-Stack E-Commerce Application

A premium, modern e-commerce platform specializing in phone cases. Built with a focus on security, performance, and a clean user experience.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![Jest](https://img.shields.io/badge/-Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

---

## 🚀 Features

### Frontend

- **Modern UI**: Clean, minimal design using the Inter font family with a slate and blue color palette.
- **Responsive Design**: Works seamlessly across desktop and mobile devices.
- **Interactive Dashboard**: User profile and order history management.
- **Admin Panel**: Comprehensive tools for product management and sales analytics.
- **Dynamic Catalog**: Real-time product filtering and search.
- **Seamless Checkout**: Integrated shopping cart with a smooth multi-step checkout process.

### Backend

- **RESTful API**: Robust and documented API endpoints for all core functionalities.
- **JWT Authentication**: Secure user sessions with token-based authentication and HTTP-only cookies.
- **Security-First**:
  - CSP (Content Security Policy) headers via Helmet.
  - Rate limiting to prevent Brute Force/DDoS attacks.
  - NoSQL Injection & XSS protection.
  - Parameter pollution prevention.
  - Input validation and sanitization.
- **Analytics System**: Background tracking of sales performance and popular products.
- **Graceful Shutdown**: Reliable server management with proper connection cleanup.

---

## 🛠️ Tech Stack

- **Server**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Testing**: Jest & Supertest
- **Logging**: Winston
- **Linting & Formatting**: ESLint & Prettier

---

## 📦 Project Structure

```text
├── public/             # Client-side assets (JS, CSS)
├── src/
│   ├── config/         # Database and configuration files
│   ├── controllers/    # Request handlers & business logic
│   ├── middleware/     # Auth, validation, and security middlewares
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API and view route definitions
│   ├── utils/          # Helper functions and utilities
│   └── app.js          # Express app configuration
├── tests/              # Unit and integration tests
├── views/              # Strategic HTML templates
├── server.js           # Application entry point
└── .env.example        # Environment variable template
```

---

## 🚦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd online-store
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory and copy the contents from `.env.example`:

   ```env
   MONGODB_URI=mongodb://localhost:27017/online_store
   JWT_TOKEN=your_super_secret_key
   PORT=3000
   ```

4. **Start the application**:
   - For development: `npm run dev`
   - For production: `npm start`

---

## 🧪 Testing & Quality

The project includes a comprehensive suite of tests covering authentication, ordering, and security vulnerabilities.

```bash
# Run all tests
npm test            # or: just test

# Run linting
npm run lint       # or: just lint

# Format code with Prettier
npm run format     # or: just format
```

---

## 🛠️ Justfile (Optional)

If you have `just` installed, you can use the following shorthand commands:

- `just dev`: Start development server
- `just format`: Run Prettier
- `just test`: Run tests
- `just lint`: Run ESLint
- `just lint-fix`: Run ESLint with auto-fix

---

## 🛡️ Security Implementation

This application implements several security best practices:

- **Rate Limiting**: Limits the number of requests to `/api` routes.
- **Data Sanitization**: Prevents NoSQL query injection and cross-site scripting (XSS).
- **Security Headers**: Uses `helmet` to set various security-related HTTP headers.
- **HPP**: Protects against HTTP Parameter Pollution.
- **Input Validation**: Uses `express-validator` and `validator.js` to ensure data integrity.

---

## 📄 License

This project is licensed under the ISC License.
