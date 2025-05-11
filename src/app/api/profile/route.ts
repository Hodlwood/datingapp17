import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { corsMiddleware } from '@/lib/middleware/cors';
import { apiLimiter, profileUpdateLimiter } from '@/lib/middleware/rateLimit';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';
import { logger } from '@/lib/utils/logger';
import { validateRequest, profileUpdateSchema } from '@/lib/utils/validation';
import { sanitizeObject } from '@/lib/utils/sanitize';

export async function GET(request: NextRequest) {
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

    // Get user data from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    logger.info('Profile data retrieved', { userId });

    return NextResponse.json(userData);
  } catch (error) {
    logger.error('Error in profile endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const rateLimitResult = await profileUpdateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

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

    // Validate request body
    const validationResult = await validateRequest(request, profileUpdateSchema);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Get user data from Firestore
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Sanitize the update data
    const updateData = sanitizeObject(validationResult.data as Record<string, any>);

    // Additional validation for sensitive fields
    if (updateData.email) {
      // Check if email is already in use by another user
      const emailQuery = await db.collection('users')
        .where('email', '==', updateData.email)
        .where('__name__', '!=', userId)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    // Update user data
    await userRef.update(updateData);

    const updatedFields = Object.keys(updateData);
    logger.info('Profile updated successfully', { 
      userId,
      updatedFields
    });

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      updatedFields
    });
  } catch (error) {
    logger.error('Error updating profile', { error });
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 