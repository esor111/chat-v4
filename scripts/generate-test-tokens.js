const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate test JWT tokens for the users
function generateTestTokens() {
  const secret = process.env.EXTERNAL_JWT_SECRET;
  
  if (!secret) {
    throw new Error('EXTERNAL_JWT_SECRET environment variable is required');
  }
  
  // User data
  const users = [
    {
      userId: 'afc70db3-6f43-4882-92fd-4715f25ffc95',
      kahaId: 'U-ISHWOR',
      name: 'Ishwor Gautam'
    },
    {
      userId: 'c5c3d135-4968-450b-9fca-57f01e0055f7',
      kahaId: 'U-7A14FA',
      name: 'Bhuwan Hamal'
    }
  ];

  console.log('🔑 Generating test JWT tokens...\n');

  const tokens = {};

  function createTokenPayload(user) {
    const now = Math.floor(Date.now() / 1000);
    return {
      userId: user.userId,
      kahaId: user.kahaId,
      name: user.name,
      iat: now,
      exp: now + (24 * 60 * 60) // 24 hours
    };
  }
  
  users.forEach(user => {
    const payload = createTokenPayload(user);
    const token = jwt.sign(payload, secret);
    
    console.log(`${user.name} (${user.userId}):`);
    console.log(`Token: ${token}\n`);
    
    // Store token with a clean key
    const key = user.name.toLowerCase().split(' ')[0];
    tokens[key] = token;
  });

  return tokens;
}

if (require.main === module) {
  const tokens = generateTestTokens();
  
  console.log('✅ Test tokens generated successfully!');
  console.log('\nYou can now use these tokens in your test scripts.');
  console.log('\nTo test the API:');
  console.log('curl -H "Authorization: Bearer <token>" http://localhost:3000/api/conversations');
}

module.exports = { generateTestTokens };