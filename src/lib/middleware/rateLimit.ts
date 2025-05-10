import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limit store (in-memory for now, consider using Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Helper function to get client IP
function getClientIP(request: Request): string {
  const headersList = headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  return forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
}

// General API rate limiter
export async function apiLimiter(request: Request) {
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
export async function authLimiter(request: Request) {
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
export async function messageLimiter(request: Request) {
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
export async function profileUpdateLimiter(request: Request) {
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