import { NextRequest, NextResponse } from 'next/server';
import { validateFile, sanitizeFilename } from '../utils/fileValidation';
import { logger } from '../utils/logger';

export async function fileUploadMiddleware(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Check if the request contains files
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return handler(request);
    }

    // Clone the request to read the form data
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];

    // If no files, proceed with the original handler
    if (!files.length) {
      return handler(request);
    }

    // Validate each file
    for (const file of files) {
      const validation = await validateFile(file);
      if (!validation.valid) {
        logger.warn('File validation failed', {
          filename: file.name,
          error: validation.error
        });
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Sanitize the filename
      const sanitizedFilename = sanitizeFilename(file.name);
      if (sanitizedFilename !== file.name) {
        // Create a new File object with the sanitized name
        const sanitizedFile = new File([file], sanitizedFilename, {
          type: file.type,
          lastModified: file.lastModified
        });
        formData.set('file', sanitizedFile);
      }
    }

    // Create a new request with the validated and sanitized files
    const newRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: formData
    });

    // Proceed with the original handler
    return handler(newRequest);
  } catch (error) {
    logger.error('Error in file upload middleware', { error });
    return NextResponse.json(
      { error: 'Error processing file upload' },
      { status: 500 }
    );
  }
} 