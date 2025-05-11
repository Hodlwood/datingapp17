import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { corsMiddleware } from '@/lib/middleware/cors';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { requestSizeMiddleware } from '@/lib/middleware/requestSize';
import { timeoutMiddleware } from '@/lib/middleware/timeout';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';
import { fileUploadMiddleware } from '@/lib/middleware/fileUpload';
import { logger } from '@/lib/utils/logger';

async function handlePictureUpload(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply security headers
    const securityHeadersResponse = await securityHeadersMiddleware(request);
    if (securityHeadersResponse) return securityHeadersResponse;

    // Apply CORS
    const corsResponse = await corsMiddleware(request);
    if (corsResponse) return corsResponse;

    // Apply rate limiting
    const rateLimitResponse = await apiLimiter(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Apply request size validation
    const sizeResponse = await requestSizeMiddleware(request);
    if (sizeResponse) return sizeResponse;

    // Get the user's ID from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload the file to Firebase Storage
    const bucket = getStorage().bucket();
    const buffer = await file.arrayBuffer();
    const filename = `profile-pictures/${userId}/${file.name}`;
    const fileBuffer = Buffer.from(buffer);

    await bucket.file(filename).save(fileBuffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          userId,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Get the public URL
    const [url] = await bucket.file(filename).getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future expiration
    });

    logger.info('Profile picture uploaded successfully', {
      userId,
      filename
    });

    return NextResponse.json({ url });
  } catch (error) {
    logger.error('Error uploading profile picture', { error });
    return NextResponse.json(
      { error: 'Error uploading profile picture' },
      { status: 500 }
    );
  }
}

// Apply middleware
export const POST = (request: NextRequest): Promise<NextResponse> =>
  timeoutMiddleware(request, () =>
    fileUploadMiddleware(request, handlePictureUpload)
  ); 