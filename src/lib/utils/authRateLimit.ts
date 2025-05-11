import { logger } from './logger';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  backoffUntil: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const MAX_ATTEMPTS = 5;
const INITIAL_BACKOFF = 1000; // 1 second
const MAX_BACKOFF = 32000; // 32 seconds

export function handleAuthRateLimit(userId: string): { shouldRetry: boolean; backoffMs: number } {
  const now = Date.now();
  const state = rateLimitStore.get(userId) || {
    attempts: 0,
    lastAttempt: 0,
    backoffUntil: 0,
  };

  // Reset attempts if last attempt was more than 1 hour ago
  if (now - state.lastAttempt > 3600000) {
    state.attempts = 0;
  }

  // Check if we're in backoff period
  if (now < state.backoffUntil) {
    return {
      shouldRetry: false,
      backoffMs: state.backoffUntil - now,
    };
  }

  // Update state
  state.attempts++;
  state.lastAttempt = now;

  // Calculate backoff
  const backoffMs = Math.min(
    INITIAL_BACKOFF * Math.pow(2, state.attempts - 1),
    MAX_BACKOFF
  );
  state.backoffUntil = now + backoffMs;

  // Store updated state
  rateLimitStore.set(userId, state);

  // Log rate limit event
  logger.warn('Auth rate limit triggered', {
    userId,
    attempts: state.attempts,
    backoffMs,
  });

  return {
    shouldRetry: state.attempts <= MAX_ATTEMPTS,
    backoffMs,
  };
}

export function resetAuthRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
  logger.info('Auth rate limit reset', { userId });
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((state, userId) => {
    if (now - state.lastAttempt > 3600000) {
      rateLimitStore.delete(userId);
    }
  });
}, 3600000); // Run every hour 