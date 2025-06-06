import { NextRequest, NextResponse } from 'next/server';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';

export async function GET(request: NextRequest) {
  try {
    // Apply security headers
    const securityResponse = await securityHeadersMiddleware(request);
    if (securityResponse) {
      return securityResponse;
    }

    // Apply CORS middleware
    const corsResponse = await corsMiddleware(request);
    if (corsResponse) {
      return corsResponse;
    }

    // Apply rate limiting
    const rateLimitResult = await apiLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      throw new NotFoundError('Deepgram service is not configured');
    }

    logger.info('Providing Deepgram API key', {}, request);

    return NextResponse.json({ apiKey: process.env.DEEPGRAM_API_KEY });
  } catch (error) {
    logger.error('Error providing Deepgram API key', { error }, request);
    return errorResponse(error);
  }
} 