import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, anthropicMessageSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';
import { sanitizeText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { requestSizeMiddleware } from '@/lib/middleware/requestSize';
import { timeoutMiddleware } from '@/lib/middleware/timeout';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';

export const runtime = "edge";

async function handleChatRequest(request: NextRequest) {
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

    // Check request size
    const sizeLimitResponse = await requestSizeMiddleware(request);
    if (sizeLimitResponse) {
      return sizeLimitResponse;
    }

    // Validate request body
    const validationResult = await validateRequest(request, anthropicMessageSchema);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error);
    }

    // Sanitize the input data
    const { messages } = validationResult.data;
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: sanitizeText(msg.content)
    }));

    logger.info('Processing Anthropic chat request', { messageCount: sanitizedMessages.length }, request);

    const result = await streamText({
      model: anthropic("claude-3-5-sonnet-20240620"),
      messages: convertToCoreMessages(sanitizedMessages),
      system: "You are a helpful AI assistant",
    });

    logger.info('Anthropic chat response received', { model: 'claude-3-5-sonnet-20240620' }, request);

    return result.toDataStreamResponse();
  } catch (error) {
    logger.error('Error processing Anthropic chat request', { error }, request);
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  return timeoutMiddleware(request, handleChatRequest);
}
