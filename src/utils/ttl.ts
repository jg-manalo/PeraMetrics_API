// Redis cache TTL values in seconds

// Long-term TTL for refresh tokens (14 days)
export const longTermTTL = 14 * 24 * 60 * 60;

// Short-term TTL for access tokens (1 hour)
export const shortTermTTL = 1 * 60 * 60;
