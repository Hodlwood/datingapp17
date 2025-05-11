import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, openaiMessageSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';
import { sanitizeText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { requestSizeMiddleware } from '@/lib/middleware/requestSize';
import { timeoutMiddleware } from '@/lib/middleware/timeout';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const systemPrompt = `You are an expert dating coach and relationship advisor specializing in helping entrepreneurs find meaningful relationships. Your role is to:

1. Provide personalized dating advice based on user's situation
2. Help users understand and articulate their dating preferences
3. Offer guidance on creating an attractive dating profile
4. Share tips for maintaining work-life balance while dating
5. Give advice on communication and building healthy relationships
6. Help users navigate common dating challenges

Always maintain a professional, supportive tone and focus on practical, actionable advice. Respect user privacy and avoid making assumptions about their specific situation.`;

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
    const validationResult = await validateRequest(request, openaiMessageSchema);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error);
    }

    if (!openai) {
      throw new NotFoundError('OpenAI service is not configured');
    }

    // Add system prompt to the beginning of the conversation
    const messagesWithSystem: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...validationResult.data.messages
    ];

    // Sanitize the input data
    const sanitizedMessages = messagesWithSystem.map(msg => ({
      ...msg,
      content: sanitizeText(msg.content as string)
    }));

    logger.info('Processing OpenAI chat request', { messageCount: sanitizedMessages.length }, request);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: sanitizedMessages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true
    });

    logger.info('OpenAI chat response received', { model: 'gpt-4' }, request);

    return new Response(response.toReadableStream());
  } catch (error) {
    logger.error('Error processing OpenAI chat request', { error }, request);
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  return handleChatRequest(request);
}
