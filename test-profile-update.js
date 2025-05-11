const fetch = require('node-fetch');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config({ path: '.env.test' });

// Debug: Log environment variables (excluding sensitive data)
console.log('Environment check:', {
  email: process.env.TEST_USER_EMAIL,
  hasPassword: !!process.env.TEST_USER_PASSWORD,
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testProfileUpdate() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Sign in with Firebase
    console.log('Signing in...');
    const userCredential = await signInWithEmailAndPassword(
      auth,
      process.env.TEST_USER_EMAIL,
      process.env.TEST_USER_PASSWORD
    );
    
    const token = await userCredential.user.getIdToken();
    console.log('Successfully signed in');

    // Test profile update
    const updateResponse = await fetch('http://localhost:3000/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: 'Test User',
        bio: 'This is a test bio',
        interests: ['coding', 'reading'],
        age: 25,
        gender: 'other',
        lookingFor: ['male', 'female']
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Update response:', errorText);
      throw new Error(`Profile update failed: ${errorText}`);
    }

    const result = await updateResponse.json();
    console.log('Profile update successful:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testProfileUpdate(); 