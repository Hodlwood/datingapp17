#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Generate test tokens if they don't exist
if [ ! -f "src/tests/load/test-tokens.json" ]; then
  echo "Generating test tokens..."
  node src/tests/load/generate-tokens.js
fi

# Run k6 test with Firebase configuration
k6 run \
  -e FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  -e FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  -e FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  -e FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  -e FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  -e FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  src/tests/load/firebase-test.js 