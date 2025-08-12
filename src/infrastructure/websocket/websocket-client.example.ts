/**
 * WebSocket Client Example
 * 
 * This file shows how to connect to the chat WebSocket gateway
 * and interact with it from a client application.
 */

// Example using socket.io-client (would be installed separately)
/*
import { io, Socket } from 'socket.io-client';

class ChatClient {
  private socket: Socket;
  private token: string;

  constructor(serverUrl: string, token: string) {
    this.token = token;
    
    // Connect to the chat namespace with authentication
    this.socket = io(`${serverUrl}/chat`, {
      auth: {
        token: this.token,
      },
      // Alternative: pass token in query
      // query: { token: this.token }
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('connected', (data) => {
      console.log('Authentication successful:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    // Message events
    this.socket.on('new_message', (message) => {
      console.log('New message received:', message);
      // Handle incoming message in UI
    });

    this.socket.on('message_sent', (confirmation) => {
      console.log('Message sent successfully:', confirmation);
      // Update UI to show message was sent
    });

    // Conversation events
    this.socket.on('joined_conversation', (data) => {
      console.log('Joined conversation:', data);
    });

    this.socket.on('left_conversation', (data) => {
      console.log('Left conversation:', data);
    });

    this.socket.on('user_joined_conversation', (data) => {
      console.log('User joined conversation:', data);
      // Update participant list in UI
    });

    // Typing events
    this.socket.on('user_typing', (data) => {
      console.log('User typing status:', data);
      // Show/hide typing indicator in UI
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Show error message in UI
    });
  }

  // Join a conversation
  joinConversation(conversationId: number): void {
    this.socket.emit('join_conversation', {
      conversation_id: conversationId,
    });
  }

  // Leave a conversation
  leaveConversation(conversationId: number): void {
    this.socket.emit('leave_conversation', {
      conversation_id: conversationId,
    });
  }

  // Send a message
  sendMessage(conversationId: number, content: string, messageType: string = 'text'): void {
    this.socket.emit('send_message', {
      conversation_id: conversationId,
      content,
      message_type: messageType,
    });
  }

  // Start typing indicator
  startTyping(conversationId: number): void {
    this.socket.emit('typing_start', {
      conversation_id: conversationId,
    });
  }

  // Stop typing indicator
  stopTyping(conversationId: number): void {
    this.socket.emit('typing_stop', {
      conversation_id: conversationId,
    });
  }

  // Disconnect
  disconnect(): void {
    this.socket.disconnect();
  }
}

// Usage example:
const client = new ChatClient('http://localhost:3000', 'your-jwt-token-here');

// Join a conversation
client.joinConversation(123);

// Send a message
client.sendMessage(123, 'Hello everyone!');

// Start typing
client.startTyping(123);

// Stop typing after 2 seconds
setTimeout(() => {
  client.stopTyping(123);
}, 2000);
*/

/**
 * Browser JavaScript Example (without TypeScript)
 */
/*
// Include socket.io client library in your HTML:
// <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

const token = 'your-jwt-token-here';
const socket = io('http://localhost:3000/chat', {
  auth: { token }
});

// Connection
socket.on('connect', () => {
  console.log('Connected to chat');
});

socket.on('connected', (data) => {
  console.log('Authenticated:', data);
  
  // Join a conversation after authentication
  socket.emit('join_conversation', { conversation_id: 123 });
});

// Messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Add message to chat UI
  addMessageToUI(message);
});

// Send message function
function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const conversationId = 123; // Get from current conversation
  
  socket.emit('send_message', {
    conversation_id: conversationId,
    content: messageInput.value,
  });
  
  messageInput.value = '';
}

// Typing indicators
let typingTimer;
function handleTyping() {
  const conversationId = 123;
  
  // Start typing
  socket.emit('typing_start', { conversation_id: conversationId });
  
  // Clear existing timer
  clearTimeout(typingTimer);
  
  // Stop typing after 1 second of inactivity
  typingTimer = setTimeout(() => {
    socket.emit('typing_stop', { conversation_id: conversationId });
  }, 1000);
}

// Listen for typing from others
socket.on('user_typing', (data) => {
  if (data.is_typing) {
    showTypingIndicator(data.user_name);
  } else {
    hideTypingIndicator(data.user_name);
  }
});
*/

export {}; // Make this a module