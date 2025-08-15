const axios = require('axios');
const io = require('socket.io-client');
const { generateTestTokens } = require('./generate-test-tokens');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Test the complete chat flow
async function testCompleteChat() {
  console.log('🚀 Starting Complete Chat Test...\n');

  // Generate test tokens
  const tokens = generateTestTokens();
  
  try {
    // Step 1: Create a conversation via REST API
    console.log('📝 Step 1: Creating conversation via REST API...');
    const conversationResponse = await axios.post(
      `${BASE_URL}/api/conversations/direct`,
      {
        target_user_id: 'afc70db3-6f43-4882-92fd-4715f25ffc95' // Ishwor's ID
      },
      {
        headers: {
          'Authorization': `Bearer ${tokens.bhuwan}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const conversationId = conversationResponse.data.conversation_id;
    console.log(`✅ Conversation created: ${conversationId}\n`);

    // Step 2: Get conversations list
    console.log('📋 Step 2: Getting conversations list...');
    const conversationsResponse = await axios.get(
      `${BASE_URL}/api/conversations`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.bhuwan}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Found ${conversationsResponse.data.total} conversations\n`);

    // Step 3: Send a message via REST API
    console.log('💬 Step 3: Sending message via REST API...');
    const messageResponse = await axios.post(
      `${BASE_URL}/api/conversations/${conversationId}/messages`,
      {
        content: 'Hello! This is a test message sent via REST API.',
        message_type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${tokens.bhuwan}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Message sent: ${messageResponse.data.message.messageId}\n`);

    // Step 4: Get messages
    console.log('📨 Step 4: Getting messages...');
    const messagesResponse = await axios.get(
      `${BASE_URL}/api/conversations/${conversationId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.bhuwan}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Found ${messagesResponse.data.messages.length} messages\n`);

    // Step 5: Test WebSocket connections
    console.log('🔌 Step 5: Testing WebSocket connections...');
    await testWebSocketChat(conversationId, tokens);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testWebSocketChat(conversationId, tokens) {
  return new Promise((resolve, reject) => {
    let ishworSocket, bhuwanSocket;
    let messagesReceived = 0;
    const expectedMessages = 4; // Number of test messages we'll send

    // Create WebSocket connections
    console.log('Connecting Ishwor...');
    ishworSocket = io(`${BASE_URL}/chat`, {
      auth: { token: tokens.ishwor },
      query: { token: tokens.ishwor }
    });

    console.log('Connecting Bhuwan...');
    bhuwanSocket = io(`${BASE_URL}/chat`, {
      auth: { token: tokens.bhuwan },
      query: { token: tokens.bhuwan }
    });

    // Connection handlers
    ishworSocket.on('connect', () => {
      console.log('✅ Ishwor connected');
    });

    bhuwanSocket.on('connect', () => {
      console.log('✅ Bhuwan connected');
    });

    ishworSocket.on('connected', (data) => {
      console.log('🔗 Ishwor connection confirmed:', data.message);
    });

    bhuwanSocket.on('connected', (data) => {
      console.log('🔗 Bhuwan connection confirmed:', data.message);
    });

    // Message handlers
    ishworSocket.on('new_message', (data) => {
      console.log(`📨 Ishwor received: "${data.content}" from ${data.sender_name || data.sender_id}`);
      messagesReceived++;
    });

    bhuwanSocket.on('new_message', (data) => {
      console.log(`📨 Bhuwan received: "${data.content}" from ${data.sender_name || data.sender_id}`);
      messagesReceived++;
    });

    // Join conversation handlers
    ishworSocket.on('joined_conversation', (data) => {
      console.log(`🏠 Ishwor joined conversation: ${data.conversation_id}`);
    });

    bhuwanSocket.on('joined_conversation', (data) => {
      console.log(`🏠 Bhuwan joined conversation: ${data.conversation_id}`);
    });

    // Typing indicators
    ishworSocket.on('user_typing', (data) => {
      if (data.is_typing) {
        console.log(`⌨️  Ishwor sees: ${data.user_name || data.user_id} is typing...`);
      } else {
        console.log(`⌨️  Ishwor sees: ${data.user_name || data.user_id} stopped typing`);
      }
    });

    bhuwanSocket.on('user_typing', (data) => {
      if (data.is_typing) {
        console.log(`⌨️  Bhuwan sees: ${data.user_name || data.user_id} is typing...`);
      } else {
        console.log(`⌨️  Bhuwan sees: ${data.user_name || data.user_id} stopped typing`);
      }
    });

    // Error handlers
    ishworSocket.on('connect_error', (error) => {
      console.error('❌ Ishwor connection error:', error);
      reject(error);
    });

    bhuwanSocket.on('connect_error', (error) => {
      console.error('❌ Bhuwan connection error:', error);
      reject(error);
    });

    // Wait for both connections, then start the test
    let connectionsReady = 0;
    const checkReady = () => {
      connectionsReady++;
      if (connectionsReady === 2) {
        startChatTest();
      }
    };

    ishworSocket.on('connected', checkReady);
    bhuwanSocket.on('connected', checkReady);

    async function startChatTest() {
      try {
        console.log('\n🧪 Starting WebSocket chat test...');

        // Join conversation
        await new Promise(resolve => setTimeout(resolve, 1000));
        ishworSocket.emit('join_conversation', { conversation_id: conversationId });
        bhuwanSocket.emit('join_conversation', { conversation_id: conversationId });

        // Wait for joins to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test typing indicators
        console.log('\n⌨️  Testing typing indicators...');
        ishworSocket.emit('typing_start', { conversation_id: conversationId });
        await new Promise(resolve => setTimeout(resolve, 1500));
        ishworSocket.emit('typing_stop', { conversation_id: conversationId });

        // Test messages
        console.log('\n💬 Testing real-time messages...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        ishworSocket.emit('send_message', {
          conversation_id: conversationId,
          content: 'Hello Bhuwan! This is Ishwor via WebSocket.',
          message_type: 'text'
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        bhuwanSocket.emit('send_message', {
          conversation_id: conversationId,
          content: 'Hi Ishwor! WebSocket is working great! 🎉',
          message_type: 'text'
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        ishworSocket.emit('send_message', {
          conversation_id: conversationId,
          content: 'Awesome! Real-time chat is perfect.',
          message_type: 'text'
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        bhuwanSocket.emit('send_message', {
          conversation_id: conversationId,
          content: 'Let\'s test rapid messages now!',
          message_type: 'text'
        });

        // Wait for all messages to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`\n📊 Test Results:`);
        console.log(`Messages sent: ${expectedMessages}`);
        console.log(`Messages received: ${messagesReceived}`);
        console.log(`Success rate: ${(messagesReceived / (expectedMessages * 2)) * 100}%`);

        // Cleanup
        ishworSocket.disconnect();
        bhuwanSocket.disconnect();

        console.log('\n✅ WebSocket test completed successfully!');
        resolve();

      } catch (error) {
        console.error('❌ WebSocket test failed:', error);
        reject(error);
      }
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('⏰ Test timeout - cleaning up...');
      if (ishworSocket) ishworSocket.disconnect();
      if (bhuwanSocket) bhuwanSocket.disconnect();
      resolve();
    }, 30000);
  });
}

// Run the complete test
if (require.main === module) {
  testCompleteChat()
    .then(() => {
      console.log('\n🎉 Complete chat test finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Complete chat test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteChat };