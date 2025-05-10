import { NextResponse } from 'next/server';
import { ValidationError } from '@/lib/utils/errorHandler';

// Default size limits (in bytes)
const DEFAULT_LIMITS = {
  json: 1024 * 1024, // 1MB for JSON requests
  text: 1024 * 1024, // 1MB for text requests
  formData: 10 * 1024 * 1024, // 10MB for form data (file uploads)
  raw: 1024 * 1024, // 1MB for raw requests
};

interface RequestSizeOptions {
  limits?: Partial<typeof DEFAULT_LIMITS>;
}

export function requestSizeLimit(options: RequestSizeOptions = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };

  return async function(request: Request) {
    const contentType = request.headers.get('content-type') || '';
    let sizeLimit: number;

    // Determine size limit based on content type
    if (contentType.includes('multipart/form-data')) {
      sizeLimit = limits.formData;
    } else if (contentType.includes('application/json')) {
      sizeLimit = limits.json;
    } else if (contentType.includes('text/')) {
      sizeLimit = limits.text;
    } else {
      sizeLimit = limits.raw;
    }

    // Get content length from headers
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > sizeLimit) {
        throw new ValidationError(`Request body too large. Maximum size is ${sizeLimit / 1024 / 1024}MB`);
      }
    }

    // For requests without content-length header, we'll check the body
    if (!contentLength && request.body) {
      const reader = request.body.getReader();
      let size = 0;
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          size += value.length;
          if (size > sizeLimit) {
            throw new ValidationError(`Request body too large. Maximum size is ${sizeLimit / 1024 / 1024}MB`);
          }
        }
      }

      // Reset the request body for further processing
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: request.signal,
      });
    }

    return null; // Continue with the request if size is within limits
  };
} 