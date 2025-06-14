const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after an hour'
});

// Task submission rate limiter
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 submissions per windowMs
  message: 'Too many task submissions from this IP, please try again after an hour'
});

// Message sending rate limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 messages per windowMs
  message: 'Too many messages sent from this IP, please try again after a minute'
});

// Blog post creation rate limiter
const blogPostLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Limit each IP to 5 posts per windowMs
  message: 'Too many blog posts created from this IP, please try again after 24 hours'
});

module.exports = {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  messageLimiter,
  blogPostLimiter
}; 