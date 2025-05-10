import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, anthropicMessageSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';
import { sanitizeText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { requestSizeMiddleware } from '@/lib/middleware/requestSize';

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    // Apply CORS middleware
    const corsResponse = corsMiddleware(request);
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
