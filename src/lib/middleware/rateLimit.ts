import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/lib/utils/logger';

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configurations
const rateLimits = {
  api: { max: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  auth: { max: 5, windowMs: 60 * 60 * 1000 },  // 5 requests per hour
  openai: { max: 10, windowMs: 60 * 1000 },    // 10 requests per minute
  profile: { max: 20, windowMs: 60 * 60 * 1000 } // 20 requests per hour
};

// Helper function to get the appropriate rate limit based on the path
function getRateLimit(path: string) {
  if (path.startsWith('/api/auth')) return rateLimits.auth;
  if (path.startsWith('/api/openai')) return rateLimits.openai;
  if (path.startsWith('/api/profile')) return rateLimits.profile;
  return rateLimits.api;
}

// Helper function to safely parse URL
function parseUrl(url: string): string {
  try {
    // If it's already a full URL, parse it
    if (url.startsWith('http')) {
      return new URL(url).pathname;
    }
    
    // If it's a relative path, ensure it starts with /
    return url.startsWith('/') ? url : `/${url}`;
  } catch (error) {
    logger.warn('Failed to parse URL', { url, error });
    // Return a safe default path
    return '/';
  }
}

export async function rateLimitMiddleware(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    
    // Safely parse the URL
    const path = parseUrl(request.url);
    
    // Skip rate limiting for static files and images
    if (
      path.startsWith('/_next') ||
      path.startsWith('/static') ||
      path.startsWith('/images') ||
      path.includes('.')
    ) {
      return new Response(null, { status: 200 });
    }

    const { max, windowMs } = getRateLimit(path);
    const now = Date.now();
    const key = `${ip}:${path}`;
    
    const record = rateLimitStore.get(key);
    let count = 1;
    let resetTime = now + windowMs;

    if (record) {
      if (now > record.resetTime) {
        // Reset if window has passed
        rateLimitStore.set(key, { count: 1, resetTime });
      } else if (record.count >= max) {
        // Rate limit exceeded
        logger.warn('Rate limit exceeded', {
          ip,
          path,
          limit: max,
          remaining: 0,
          reset: record.resetTime,
        });

        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: Math.ceil((record.resetTime - now) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': max.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': record.resetTime.toString(),
              'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
            },
          }
        );
      } else {
        // Increment count
        count = record.count + 1;
        resetTime = record.resetTime;
        rateLimitStore.set(key, { count, resetTime });
      }
    } else {
      // First request from this IP
      rateLimitStore.set(key, { count: 1, resetTime });
    }

    // Add rate limit headers to the response
    return new Response(null, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': (max - count).toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      },
    });
  } catch (error) {
    logger.error('Rate limit middleware error', { error });
    // If rate limiting fails, allow the request but log the error
    return new Response(null, { status: 200 });
  }
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const headersList = headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  return forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
}

// General API rate limiter
export async function apiLimiter(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const max = 100; // Limit each IP to 100 requests per windowMs

  const record = rateLimitStore.get(ip);
  if (record) {
    if (now > record.resetTime) {
      // Reset if window has passed
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (record.count >= max) {
      // Rate limit exceeded
      return NextResponse.json(
        { error: 'Too many requests from this IP, please try again later.' },
        { status: 429 }
      );
    } else {
      // Increment count
      record.count++;
      rateLimitStore.set(ip, record);
    }
  } else {
    // First request from this IP
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
  }

  return null; // Continue with the request
}

// Stricter limiter for authentication routes
export async function authLimiter(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const max = 5; // Limit each IP to 5 requests per windowMs

  const record = rateLimitStore.get(ip);
  if (record) {
    if (now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (record.count >= max) {
      return NextResponse.json(
        { error: 'Too many login attempts, please try again later.' },
        { status: 429 }
      );
    } else {
      record.count++;
      rateLimitStore.set(ip, record);
    }
  } else {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
  }

  return null;
}

// Stricter limiter for message sending
export async function messageLimiter(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const max = 10; // Limit each IP to 10 requests per windowMs

  const record = rateLimitStore.get(ip);
  if (record) {
    if (now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (record.count >= max) {
      return NextResponse.json(
        { error: 'Too many messages sent, please try again later.' },
        { status: 429 }
      );
    } else {
      record.count++;
      rateLimitStore.set(ip, record);
    }
  } else {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
  }

  return null;
}

// Stricter limiter for profile updates
export async function profileUpdateLimiter(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const max = 20; // Limit each IP to 20 requests per windowMs

  const record = rateLimitStore.get(ip);
  if (record) {
    if (now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (record.count >= max) {
      return NextResponse.json(
        { error: 'Too many profile updates, please try again later.' },
        { status: 429 }
      );
    } else {
      record.count++;
      rateLimitStore.set(ip, record);
    }
  } else {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
  }

  return null;
} 