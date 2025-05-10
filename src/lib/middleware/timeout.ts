import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Define timeout limits in milliseconds
const TIMEOUT_LIMITS = {
  DEFAULT: 30000, // 30 seconds default timeout
  CHAT: 60000, // 1 minute for chat requests
  EMAIL: 15000, // 15 seconds for email notifications
  IMAGE: 120000, // 2 minutes for image generation
} as const;

// Helper to get timeout limit based on route
function getTimeoutLimit(path: string): number {
  if (path.includes('/api/openai/chat') || path.includes('/api/anthropic/chat')) {
    return TIMEOUT_LIMITS.CHAT;
  }
  if (path.includes('/api/notifications/email')) {
    return TIMEOUT_LIMITS.EMAIL;
  }
  if (path.includes('/api/replicate/generate-image')) {
    return TIMEOUT_LIMITS.IMAGE;
  }
  return TIMEOUT_LIMITS.DEFAULT;
}

export async function timeoutMiddleware(request: Request, handler: (request: Request) => Promise<Response>): Promise<Response> {
  const path = new URL(request.url).pathname;
  const timeoutLimit = getTimeoutLimit(path);

  try {
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutLimit}ms`));
      }, timeoutLimit);
    });

    // Race between the handler and the timeout
    const response = await Promise.race([
      handler(request),
      timeoutPromise
    ]);

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      logger.warn('Request timeout', {
        path,
        timeoutLimit,
        method: request.method
      }, request);

      return new NextResponse(
        JSON.stringify({
          error: 'Request timed out',
          message: `The request took too long to process. Please try again.`
        }),
        {
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If it's not a timeout error, rethrow it
    throw error;
  }
} 