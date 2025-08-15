const axios = require('axios');
require('dotenv').config();

// Create a test conversation between the two users
async function createTestConversation() {
  const baseURL = 'http://localhost:3000';
  
  // Test JWT token (replace with actual token from your auth service)
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjNWMzZDEzNS00OTY4LTQ1MGItOWZjYS01N2YwMWUwMDU1ZjciLCJrYWhhSWQiOiJVLTdBMTRGQSIsImlhdCI6MTczNDI1MjU2MSwiZXhwIjoxNzM0MzM4OTYxfQ.example'; // Replace with real token

  try {
    console.log('🚀 Creating test conversation...');

    // Create direct conversation
    const response = await axios.post(
      `${baseURL}/api/conversations/direct`,
      {
        target_user_id: 'afc70db3-6f43-4882-92fd-4715f25ffc95' // Ishwor's ID
      },
      {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Conversation created successfully!');
    console.log('Conversation ID:', response.data.conversation_id);
    console.log('Response:', response.data);

    return response.data.conversation_id;

  } catch (error) {
    console.error('❌ Failed to create conversation:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Get existing conversations
async function getConversations() {
  const baseURL = 'http://localhost:3000';
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjNWMzZDEzNS00OTY4LTQ1MGItOWZjYS01N2YwMWUwMDU1ZjciLCJrYWhhSWQiOiJVLTdBMTRGQSIsImlhdCI6MTczNDI1MjU2MSwiZXhwIjoxNzM0MzM4OTYxfQ.example'; // Replace with real token

  try {
    console.log('📋 Getting existing conversations...');

    const response = await axios.get(
      `${baseURL}/api/conversations`,
      {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Conversations retrieved:');
    console.log('Total:', response.data.total);
    response.data.conversations.forEach((conv, index) => {
      console.log(`${index + 1}. ID: ${conv.conversation_id}, Type: ${conv.type}, Participants: ${conv.participants.length}`);
    });

    return response.data.conversations;

  } catch (error) {
    console.error('❌ Failed to get conversations:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return [];
  }
}

async function main() {
  try {
    // First, try to get existing conversations
    const existingConversations = await getConversations();
    
    if (existingConversations.length > 0) {
      console.log('\n✅ Using existing conversation:', existingConversations[0].conversation_id);
      return existingConversations[0].conversation_id;
    }

    // If no conversations exist, create one
    const conversationId = await createTestConversation();
    return conversationId;

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(conversationId => {
    console.log('\n🎉 Ready for WebSocket testing!');
    console.log('Conversation ID:', conversationId);
    console.log('\nNow you can run: node scripts/test-websocket-client.js');
    process.exit(0);
  });
}

module.exports = { createTestConversation, getConversations };