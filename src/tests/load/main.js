import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const discoveryTrend = new Trend('discovery_response_time');
const chatTrend = new Trend('chat_response_time');
const profileTrend = new Trend('profile_response_time');

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

// Helper function to generate random user data
function generateUserData() {
  return {
    email: `test${__VU}@example.com`,
    password: 'Test123!',
  };
}

// Helper function to handle authentication
function authenticate() {
  const userData = generateUserData();
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify(userData), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  return loginRes.json('token');
}

export default function () {
  // Simulate user session
  const token = authenticate();
  
  // Test Discovery endpoint
  const discoveryRes = http.get('http://localhost:3000/api/discovery', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(discoveryRes, {
    'discovery status is 200': (r) => r.status === 200,
  });
  
  discoveryTrend.add(discoveryRes.timings.duration);
  errorRate.add(discoveryRes.status !== 200);
  
  sleep(1);
  
  // Test Chat endpoint
  const chatRes = http.post('http://localhost:3000/api/openai/chat', 
    JSON.stringify({
      messages: [{ role: 'user', content: 'Hello' }]
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  check(chatRes, {
    'chat status is 200': (r) => r.status === 200,
  });
  
  chatTrend.add(chatRes.timings.duration);
  errorRate.add(chatRes.status !== 200);
  
  sleep(1);
  
  // Test Profile endpoint
  const profileRes = http.get('http://localhost:3000/api/profile', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
  });
  
  profileTrend.add(profileRes.timings.duration);
  errorRate.add(profileRes.status !== 200);
  
  sleep(1);
}
