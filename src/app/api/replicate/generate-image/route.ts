import { NextResponse } from "next/server";
import Replicate from "replicate";
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, imageGenerationSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';
import { sanitizeText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { requestSizeMiddleware } from '@/lib/middleware/requestSize';

const replicate = process.env.REPLICATE_API_TOKEN ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN }) : null;

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
    const validationResult = await validateRequest(request, imageGenerationSchema);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error);
    }

    if (!replicate) {
      throw new NotFoundError('Replicate service is not configured');
    }

    // Sanitize the input data
    const { prompt } = validationResult.data;
    const sanitizedPrompt = sanitizeText(prompt);

    logger.info('Processing image generation request', { prompt: sanitizedPrompt }, request);

    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: sanitizedPrompt,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 50
        }
      }
    );

    logger.info('Image generation completed', { output }, request);

    return NextResponse.json({ output });
  } catch (error) {
    logger.error('Error processing image generation request', { error }, request);
    return errorResponse(error);
  }
}
