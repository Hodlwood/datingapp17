import { NextRequest } from 'next/server';

// Define allowed origins - we'll keep it permissive for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://datingapp5.web.app',
  'https://datingapp5.firebaseapp.com'
];

// Define allowed methods
const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

// Define allowed headers
const allowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin'
];

export async function corsMiddleware(request: NextRequest): Promise<Response | null> {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '';

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Access-Control-Allow-Headers': allowedHeaders.join(', '),
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  // For actual requests, create a new response
  const response = new Response(request.body, {
    status: 200,
    headers: new Headers()
  });
  
  // Only add CORS headers if the origin is allowed
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  }

  return response;
} 