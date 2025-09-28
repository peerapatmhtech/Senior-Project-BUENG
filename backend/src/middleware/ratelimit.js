import ratelimit from 'express-rate-limit';

export const limiter = ratelimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 5 requests per windowMs
  message: "You have exceeded the rate limit, please try again after 15 minutes",
});