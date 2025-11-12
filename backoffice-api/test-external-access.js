// Simple test to verify external API access
const fetch = require('node-fetch');

async function testExternalAccess() {
  try {
    // Test the health endpoint that should be accessible externally
    const response = await fetch('https://catalogos-api.vercel.app/api/health');
    const data = await response.json();

    console.log('✅ External API access is working!');
    console.log('Status:', response.status);
    console.log('Response:', data);

    // Test CORS headers
    const corsHeaders = response.headers.get('access-control-allow-origin');
    console.log('CORS Headers:', corsHeaders);

  } catch (error) {
    console.error('❌ External API access failed:', error.message);
  }
}

testExternalAccess();