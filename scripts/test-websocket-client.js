const io = require('socket.io-client');
require('dotenv').config();

// Test WebSocket client for chat functionality
class ChatTestClient {
  constructor(userId, userName, token) {
    this.userId = userId;
    this.userName = userName;
    this.token = token;
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.userName}] Connecting to WebSocket...`);
      
      this.socket = io('http://localhost:3000/chat', {
        auth: {
          token: this.token
        },
        query: {
          token: this.token
        }
      });

      this.socket.on('connect', () => {
        console.log(`[${this.userName}] Connected with socket ID: ${this.socket.id}`);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('connected', (data) => {
        console.log(`[${this.userName}] Connection confirmed:`, data);
      });

      this.socket.on('disconnect', () => {
        console.log(`[${this.userName}] Disconnected`);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error(`[${this.userName}] Connection error:`, error);
        reject(error);
      });

      // Message events
      this.socket.on('new_message', (data) => {
        console.log(`[${this.userName}] 📨 New message:`, {
          from: data.sender_name || data.sender_id,
          content: data.content,
          conversation: data.conversation_id,
          time: data.sent_at
        });
      });

      this.socket.on('message_sent', (data) => {
        console.log(`[${this.userName}] ✅ Message sent:`, data);
      });

      this.socket.on('message_error', (data) => {
        console.error(`[${this.userName}] ❌ Message error:`, data);
      });

      // Conversation events
      this.socket.on('joined_conversation', (data) => {
        console.log(`[${this.userName}] 🏠 Joined conversation:`, data.conversation_id);
      });

      this.socket.on('user_joined_conversation', (data) => {
        console.log(`[${this.userName}] 👋 User joined:`, data.user_name || data.user_id);
      });

      this.socket.on('conversation_history', (data) => {
        console.log(`[${this.userName}] 📚 Conversation history:`, data.messages.length, 'messages');
      });

      // Typing events
      this.socket.on('user_typing', (data) => {
        if (data.is_typing) {
          console.log(`[${this.userName}] ⌨️  ${data.user_name || data.user_id} is typing...`);
        } else {
          console.log(`[${this.userName}] ⌨️  ${data.user_name || data.user_id} stopped typing`);
        }
      });

      // Read receipts
      this.socket.on('message_read', (data) => {
        console.log(`[${this.userName}] 👁️  Message read by ${data.user_id}`);
      });

      this.socket.on('marked_as_read', (data) => {
        console.log(`[${this.userName}] ✓ Marked as read:`, data.message_id);
      });

      // Error handling
      this.socket.on('error', (data) => {
        console.error(`[${this.userName}] Error:`, data);
      });

      this.socket.on('join_error', (data) => {
        console.error(`[${this.userName}] Join error:`, data);
      });

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  joinConversation(conversationId) {
    if (!this.isConnected) {
      console.error(`[${this.userName}] Not connected`);
      return;
    }

    console.log(`[${this.userName}] Joining conversation: ${conversationId}`);
    this.socket.emit('join_conversation', {
      conversation_id: conversationId
    });
  }

  sendMessage(conversationId, content, messageType = 'text') {
    if (!this.isConnected) {
      console.error(`[${this.userName}] Not connected`);
      return;
    }

    console.log(`[${this.userName}] Sending message: "${content}"`);
    this.socket.emit('send_message', {
      conversation_id: conversationId,
      content: content,
      message_type: messageType
    });
  }

  startTyping(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('typing_start', {
      conversation_id: conversationId
    });
  }

  stopTyping(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('typing_stop', {
      conversation_id: conversationId
    });
  }

  markAsRead(conversationId, messageId) {
    if (!this.isConnected) return;
    
    this.socket.emit('mark_as_read', {
      conversation_id: conversationId,
      message_id: messageId
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Test scenario
async function runChatTest() {
  console.log('🚀 Starting WebSocket Chat Test...\n');

  // Create test tokens (in real app, these would come from your auth service)
  const ishworToken = 'test-token-ishwor'; // Replace with real JWT
  const bhuwanToken = 'test-token-bhuwan'; // Replace with real JWT

  // Create clients
  const ishwor = new ChatTestClient('afc70db3-6f43-4882-92fd-4715f25ffc95', 'Ishwor', ishworToken);
  const bhuwan = new ChatTestClient('c5c3d135-4968-450b-9fca-57f01e0055f7', 'Bhuwan', bhuwanToken);

  try {
    // Connect both clients
    await Promise.all([
      ishwor.connect(),
      bhuwan.connect()
    ]);

    console.log('\n✅ Both clients connected successfully!\n');

    // Test conversation ID (you'll need to create this via API first)
    const testConversationId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual conversation ID

    // Join conversation
    await new Promise(resolve => setTimeout(resolve, 1000));
    ishwor.joinConversation(testConversationId);
    bhuwan.joinConversation(testConversationId);

    // Wait a bit for join to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test typing indicators
    console.log('\n🧪 Testing typing indicators...');
    ishwor.startTyping(testConversationId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    ishwor.stopTyping(testConversationId);

    // Test message sending
    console.log('\n🧪 Testing message sending...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    ishwor.sendMessage(testConversationId, 'Hello Bhuwan! This is a test message from Ishwor.');

    await new Promise(resolve => setTimeout(resolve, 2000));
    bhuwan.sendMessage(testConversationId, 'Hi Ishwor! I received your message. WebSocket is working! 🎉');

    await new Promise(resolve => setTimeout(resolve, 2000));
    ishwor.sendMessage(testConversationId, 'Awesome! Real-time chat is working perfectly.');

    // Test rapid messages
    console.log('\n🧪 Testing rapid messages...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    for (let i = 1; i <= 3; i++) {
      bhuwan.sendMessage(testConversationId, `Rapid message ${i}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Keep connection alive for a while to see all messages
    console.log('\n⏳ Keeping connections alive for 10 seconds to observe messages...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up connections...');
    ishwor.disconnect();
    bhuwan.disconnect();
    
    setTimeout(() => {
      console.log('✅ Test completed!');
      process.exit(0);
    }, 1000);
  }
}

// Run the test
if (require.main === module) {
  runChatTest().catch(console.error);
}

module.exports = { ChatTestClient };