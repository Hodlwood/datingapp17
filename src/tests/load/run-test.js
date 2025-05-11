const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

// Load Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Create a temporary config file for k6
const configPath = path.join(__dirname, 'firebase-config.js');
const configContent = `
export const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};
`;

require('fs').writeFileSync(configPath, configContent);

// Run k6 with the test script
const k6Command = `k6 run --out json=results.json ${path.join(__dirname, 'firebase-test.js')}`;

console.log('Starting load test...');
const k6Process = exec(k6Command);

k6Process.stdout.on('data', (data) => {
  console.log(data);
});

k6Process.stderr.on('data', (data) => {
  console.error(data);
});

k6Process.on('close', (code) => {
  console.log(`Load test completed with code ${code}`);
  // Clean up temporary config file
  require('fs').unlinkSync(configPath);
}); 