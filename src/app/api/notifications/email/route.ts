import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, emailNotificationSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';
import { errorResponse, ValidationError, NotFoundError } from '@/lib/utils/errorHandler';
import { sanitizeEmail, sanitizeText, sanitizeHTML } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { requestSizeMiddleware } from '@/lib/middleware/requestSize';
import { timeoutMiddleware } from '@/lib/middleware/timeout';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function handleEmailRequest(request: Request) {
  try {
    // Apply security headers
    const securityResponse = securityHeadersMiddleware(request);
    if (securityResponse) {
      return securityResponse;
    }

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
    const validationResult = await validateRequest(request, emailNotificationSchema);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error);
    }

    if (!resend) {
      throw new NotFoundError('Email service is not configured');
    }

    // Sanitize the input data
    const { to, subject, html } = validationResult.data;
    const sanitizedData = {
      to: sanitizeEmail(to),
      subject: sanitizeText(subject),
      html: sanitizeHTML(html)
    };

    logger.info('Sending email notification', { to: sanitizedData.to, subject: sanitizedData.subject }, request);

    const data = await resend.emails.send({
      from: 'Entrepreneur Match <notifications@entrepreneurmatch.com>',
      ...sanitizedData
    });

    logger.info('Email notification sent successfully', { data }, request);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error sending email notification', { error }, request);
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  return timeoutMiddleware(request, handleEmailRequest);
} 