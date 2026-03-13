import ratelimit from 'express-rate-limit';

const limiterInstance = ratelimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'You have exceeded the rate limit, please try again after 15 minutes',
});

// Middleware wrapper that respects the NODE_ENV flag
export const limiter = (req, res, next) => {
  // Always skip rate limiting in 'development' mode
  if (process.env.NODE_ENV === 'development') {
    return next(); // Skip rate limiting
  }

  // Otherwise (e.g., 'production'), apply rate limits
  return limiterInstance(req, res, next);
};
