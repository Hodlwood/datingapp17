import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { SharedArray } from 'k6/data';

// Custom metrics
const errorRate = new Rate('errors');
const discoveryTrend = new Trend('discovery_response_time');
const chatTrend = new Trend('chat_response_time');
const profileTrend = new Trend('profile_response_time');

// Firebase configuration
const firebaseConfig = {
  apiKey: __ENV.FIREBASE_API_KEY,
  authDomain: __ENV.FIREBASE_AUTH_DOMAIN,
  projectId: __ENV.FIREBASE_PROJECT_ID,
  storageBucket: __ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: __ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: __ENV.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load pre-generated tokens
const tokens = new SharedArray('tokens', function() {
  return JSON.parse(open('./test-tokens.json'));
});

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'errors': ['rate<0.1'],          // Error rate should be less than 10%
    'discovery_response_time': ['p(95)<2000'], // 95% of discovery requests should be below 2s
    'chat_response_time': ['p(95)<1000'],      // 95% of chat requests should be below 1s
    'profile_response_time': ['p(95)<1000'],   // 95% of profile requests should be below 1s
  },
};

export default async function () {
  try {
    // Get a token using round-robin
    const tokenData = tokens[__VU % tokens.length];
    const token = tokenData.token;
    
    // Test Discovery
    const discoveryStart = new Date().getTime();
    const discoveryQuery = query(
      collection(db, 'users'),
      where('gender', '!=', 'unknown'), // Using a placeholder since we don't have user gender
      limit(10)
    );
    const discoverySnapshot = await getDocs(discoveryQuery);
    const discoveryEnd = new Date().getTime();
    
    check(discoverySnapshot, {
      'discovery query successful': (r) => !r.empty,
    });
    
    discoveryTrend.add(discoveryEnd - discoveryStart);
    errorRate.add(discoverySnapshot.empty);
    
    sleep(1);
    
    // Test Chat endpoint (using OpenAI API)
    const chatStart = new Date().getTime();
    const chatRes = await fetch('http://localhost:3000/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });
    const chatEnd = new Date().getTime();
    
    check(chatRes, {
      'chat status is 200': (r) => r.status === 200,
    });
    
    chatTrend.add(chatEnd - chatStart);
    errorRate.add(chatRes.status !== 200);
    
    sleep(1);
    
    // Test Profile
    const profileStart = new Date().getTime();
    const profileQuery = query(
      collection(db, 'users'),
      where('email', '==', tokenData.email)
    );
    const profileSnapshot = await getDocs(profileQuery);
    const profileEnd = new Date().getTime();
    
    check(profileSnapshot, {
      'profile query successful': (r) => !r.empty,
    });
    
    profileTrend.add(profileEnd - profileStart);
    errorRate.add(profileSnapshot.empty);
    
    sleep(1);
  } catch (error) {
    console.error('Test error:', error);
    errorRate.add(1);
  }
} 