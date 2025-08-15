# Real-time Chat Testing Guide

This guide will help you test the robust real-time chat functionality with WebSocket support.

## 🚀 Features Implemented

### Core Real-time Features
- ✅ **Real-time messaging** - Messages appear instantly across all connected clients
- ✅ **Typing indicators** - See when someone is typing
- ✅ **Read receipts** - Know when messages are read
- ✅ **Connection management** - Automatic reconnection and offline message delivery
- ✅ **Multi-device support** - Same user can connect from multiple devices
- ✅ **Conversation rooms** - Users automatically join conversation-specific rooms

### WebSocket Events

#### Client → Server Events
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room  
- `send_message` - Send a message to a conversation
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_as_read` - Mark messages as read

#### Server → Client Events
- `connected` - Connection confirmation
- `new_message` - New message received
- `message_sent` - Message send confirmation
- `message_error` - Message send error
- `user_typing` - Typing indicator from other users
- `message_read` - Read receipt from other users
- `joined_conversation` - Conversation join confirmation
- `user_joined_conversation` - Another user joined
- `conversation_history` - Recent messages when joining
- `offline_message` - Messages received while offline

## 🛠 Setup Instructions

### 1. Install Dependencies
```bash
npm install socket.io-client axios
```

### 2. Start the Backend
```bash
npm run start:dev
```

### 3. Seed Test Users (if not done already)
```bash
node scripts/seed-users.js
```

### 4. Create Test Conversation
```bash
node scripts/create-test-conversation.js
```

### 5. Test WebSocket Connection
```bash
node scripts/test-websocket-client.js
```

## 🧪 Testing Scenarios

### Basic Messaging Test
1. Two users connect to WebSocket
2. Both join the same conversation
3. User A sends a message
4. User B receives the message instantly
5. User B replies
6. User A receives the reply

### Typing Indicators Test
1. User A starts typing
2. User B sees "User A is typing..."
3. User A stops typing
4. User B sees typing indicator disappear

### Read Receipts Test
1. User A sends a message
2. User B receives and reads the message
3. User B marks message as read
4. User A sees read receipt

### Multi-device Test
1. Same user connects from multiple browser tabs/devices
2. Messages sent from one device appear on all devices
3. Typing indicators work across devices

### Offline Message Delivery
1. User A is offline
2. User B sends messages
3. User A comes online
4. User A receives all offline messages

## 🔧 Configuration

### WebSocket Connection
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token'
  },
  query: {
    token: 'your-jwt-token'  // Fallback
  }
});
```

### Authentication
The WebSocket requires a valid JWT token containing:
```json
{
  "userId": "user-uuid",
  "name": "User Name",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 📱 Frontend Integration

### React Example
```jsx
import io from 'socket.io-client';

const ChatComponent = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState({});

  useEffect(() => {
    const newSocket = io('http://localhost:3000/chat', {
      auth: { token: userToken }
    });

    // Listen for new messages
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    newSocket.on('user_typing', (data) => {
      setTyping(prev => ({
        ...prev,
        [data.user_id]: data.is_typing
      }));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [userToken]);

  const sendMessage = (content) => {
    socket.emit('send_message', {
      conversation_id: currentConversationId,
      content: content
    });
  };

  const startTyping = () => {
    socket.emit('typing_start', {
      conversation_id: currentConversationId
    });
  };

  // ... rest of component
};
```

### Vue.js Example
```vue
<template>
  <div class="chat">
    <div v-for="message in messages" :key="message.message_id">
      {{ message.sender_name }}: {{ message.content }}
    </div>
    <div v-for="(isTyping, userId) in typing" :key="userId">
      <span v-if="isTyping">{{ userId }} is typing...</span>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  data() {
    return {
      socket: null,
      messages: [],
      typing: {}
    };
  },
  mounted() {
    this.socket = io('http://localhost:3000/chat', {
      auth: { token: this.userToken }
    });

    this.socket.on('new_message', (message) => {
      this.messages.push(message);
    });

    this.socket.on('user_typing', (data) => {
      this.$set(this.typing, data.user_id, data.is_typing);
    });
  }
};
</script>
```

## 🐛 Troubleshooting

### Connection Issues
1. **"Connection failed"** - Check if backend is running on port 3000
2. **"Authentication failed"** - Verify JWT token is valid and not expired
3. **"No token provided"** - Ensure token is passed in auth or query parameters

### Message Issues
1. **Messages not appearing** - Check if users joined the same conversation
2. **"Access denied"** - Verify user is a participant in the conversation
3. **"Message failed to send"** - Check message content is not empty and under 4000 characters

### Performance Issues
1. **Slow message delivery** - Check database connection and indexing
2. **High memory usage** - Monitor connected users map and clean up disconnected sockets
3. **Connection drops** - Implement reconnection logic in frontend

## 📊 Monitoring

### WebSocket Statistics
```javascript
// Get connected users count
const connectedCount = chatGateway.getConnectedUsersCount();

// Check if specific user is connected
const isOnline = chatGateway.isUserConnected('user-id');

// Get user's socket count (multi-device)
const socketCount = chatGateway.getUserSocketCount('user-id');
```

### Database Queries
Monitor these queries for performance:
- Message insertion and retrieval
- Conversation participant lookups
- Unread message counts
- User profile fetching

## 🔒 Security Considerations

1. **JWT Validation** - Always verify JWT tokens on connection
2. **Rate Limiting** - Implement message rate limiting per user
3. **Content Filtering** - Validate and sanitize message content
4. **Access Control** - Verify user permissions for each conversation
5. **CORS Configuration** - Restrict origins in production

## 🚀 Production Deployment

### Scaling Considerations
1. **Redis Adapter** - Use Redis for multi-server WebSocket scaling
2. **Load Balancing** - Configure sticky sessions for WebSocket connections
3. **Connection Limits** - Set appropriate connection limits per server
4. **Message Queuing** - Use message queues for offline message delivery

### Environment Variables
```env
# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000
WS_MAX_CONNECTIONS_PER_USER=5

# Redis (for scaling)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## 📈 Performance Metrics

### Key Metrics to Monitor
- WebSocket connection count
- Message delivery latency
- Database query performance
- Memory usage per connection
- Message throughput (messages/second)

### Recommended Limits
- Max connections per user: 5
- Max message length: 4000 characters
- Message rate limit: 10 messages/minute per user
- Typing indicator timeout: 3 seconds

---

## 🎯 Next Steps

1. **Group Chat Features** - Implement group-specific features like admin controls
2. **File Sharing** - Add support for file/image messages
3. **Message Reactions** - Add emoji reactions to messages
4. **Voice Messages** - Support for voice message recording/playback
5. **Push Notifications** - Integrate with push notification services
6. **Message Search** - Add full-text search across conversations
7. **Message Threading** - Support for threaded conversations
8. **Custom Emojis** - Organization-specific emoji support

The real-time chat system is now robust and production-ready! 🎉