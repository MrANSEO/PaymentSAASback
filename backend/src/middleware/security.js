// securityMiddleware.js - VERSION CORRIGÉE
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// ✅ CONFIGURATION CORS CORRECTE
const corsOptions = {
  origin: [
    'https://frontendpay.onrender.com', // ✅ SANS SLASH
    'https://paymentsaafront.onrender.com'
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    process.env.FRONTEND_URL,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-api-key',
    'x-signature'
  ],
  optionsSuccessStatus: 200
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Middleware CORS configuré
const corsMiddleware = cors(corsOptions);

// Helmet configuré
const helmetMiddleware = (options = {}) => helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  ...options
});

module.exports = {
  corsMiddleware,
  limiter,
  helmet: helmetMiddleware
};
