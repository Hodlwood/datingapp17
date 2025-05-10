import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, emailNotificationSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';

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
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 503 }
      );
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
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 