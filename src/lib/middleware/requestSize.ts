import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Define size limits in bytes
const SIZE_LIMITS = {
  DEFAULT: 1024 * 1024, // 1MB default limit
  CHAT: 1024 * 1024 * 2, // 2MB for chat messages
  EMAIL: 1024 * 1024 * 5, // 5MB for email notifications
  IMAGE: 1024 * 1024 * 10, // 10MB for image generation
} as const;

// Helper to get size limit based on route
function getSizeLimit(path: string): number {
  if (path.includes('/api/openai/chat') || path.includes('/api/anthropic/chat')) {
    return SIZE_LIMITS.CHAT;
  }
  if (path.includes('/api/notifications/email')) {
    return SIZE_LIMITS.EMAIL;
  }
  if (path.includes('/api/replicate/generate-image')) {
    return SIZE_LIMITS.IMAGE;
  }
  return SIZE_LIMITS.DEFAULT;
}

export async function requestSizeMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    const contentLength = request.headers.get('content-length');
    const path = new URL(request.url).pathname;

    // Skip for GET requests or requests without content length
    if (request.method === 'GET' || !contentLength) {
      return null;
    }

    const sizeLimit = getSizeLimit(path);
    const requestSize = parseInt(contentLength, 10);

    if (requestSize > sizeLimit) {
      logger.warn('Request size limit exceeded', {
        path,
        requestSize,
        sizeLimit,
        method: request.method
      }, request);

      return NextResponse.json(
        {
          error: 'Request payload too large',
          maxSize: `${sizeLimit / (1024 * 1024)}MB`
        },
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return null;
  } catch (error) {
    logger.error('Error in request size middleware', { error }, request);
    return null; // Fail open to not block legitimate requests
  }
} 