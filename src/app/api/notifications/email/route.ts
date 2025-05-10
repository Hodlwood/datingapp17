import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, emailNotificationSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

    // Validate request body
    const validationResult = await validateRequest(request, emailNotificationSchema);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error);
    }

    if (!resend) {
      throw new NotFoundError('Email service is not configured');
    }

    const { to, subject, html } = validationResult.data;

    const data = await resend.emails.send({
      from: 'Entrepreneur Match <notifications@entrepreneurmatch.com>',
      to,
      subject,
      html,
    });

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
} 