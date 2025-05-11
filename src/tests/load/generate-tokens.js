import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Number of test users to generate
const NUM_TEST_USERS = 100;

async function generateTokens() {
  const tokens = [];
  
  for (let i = 0; i < NUM_TEST_USERS; i++) {
    try {
      const email = `test${i}@example.com`;
      const password = 'Test123!';
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      tokens.push({
        email,
        token
      });
      
      console.log(`Generated token for user ${i + 1}/${NUM_TEST_USERS}`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate token for user ${i}:`, error);
    }
  }
  
  // Save tokens to a file
  const fs = require('fs');
  fs.writeFileSync('src/tests/load/test-tokens.json', JSON.stringify(tokens, null, 2));
  console.log('Tokens saved to test-tokens.json');
}

generateTokens().catch(console.error); 