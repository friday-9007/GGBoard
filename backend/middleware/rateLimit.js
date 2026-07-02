/**
 * Rate limiting middleware (express-rate-limit v8).
 * - apiLimiter: lenient global cap to protect the API from floods.
 * - authLimiter: stricter cap on /auth to slow brute-force login/registration.
 */

const { rateLimit } = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // generous — normal usage stays well under this
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // per IP — enough for real users, hostile to brute force
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in a few minutes.' },
});

module.exports = { apiLimiter, authLimiter };
