import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { corsMiddleware } from '@/lib/middleware/cors';
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { securityHeadersMiddleware } from '@/lib/middleware/securityHeaders';
import { logger } from '@/lib/utils/logger';

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

    // Get user preferences from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Query for potential matches based on preferences
    const matchesQuery = db.collection('users')
      .where('gender', '==', userData.preferredGender)
      .where('preferredGender', '==', userData.gender)
      .limit(10);

    const matchesSnapshot = await matchesQuery.get();
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('Discovery matches found', { 
      userId,
      matchCount: matches.length 
    });

    return NextResponse.json({ matches });
  } catch (error) {
    logger.error('Error in discovery endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to get matches' },
      { status: 500 }
    );
  }
} 