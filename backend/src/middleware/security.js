// securityMiddleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Configuration CORS
const corsOptions = {
origin: process.env.FRONTEND_URL || [
    'http://localhost:3000',
    'http://localhost:3001', // ← AJOUTE CETTE LIGNE
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'https://frontendpay.onrender.com',
      process.env.FRONTEND_URL,

     // si tu veux prévoir
    // Ajoute ton URL de prod plus tard
  ],
  credentials: true, // important pour les cookies / auth
  optionsSuccessStatus: 200,
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par 15 minutes
});

// Middleware CORS configuré
const corsMiddleware = cors(corsOptions);

// ✅ On exporte une fonction helmet configurée correctement
const helmetMiddleware = (options = {}) => helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  ...options, // permet de fusionner avec d’autres options
});

module.exports = {
  corsMiddleware,
  limiter,
  helmet: helmetMiddleware,
};