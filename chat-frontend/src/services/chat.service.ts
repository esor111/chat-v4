import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { Message, Conversation, SendMessageRequest } from '../types/chat';
import { authService } from './auth.service';

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000/chat';

class ChatService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private typingHandlers: ((data: any) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  // WebSocket connection
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = authService.getToken();
      if (!token) {
        reject(new Error('No authentication token'));
        return;
      }

      this.socket = io(WS_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to chat server');
        this.connectionHandlers.forEach(handler => handler(true));
        resolve();
      });

      this.socket.on('connected', (data) => {
        console.log('Authentication successful:', data);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from chat server');
        this.connectionHandlers.forEach(handler => handler(false));
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('new_message', (message: Message) => {
        console.log('New message received:', message);
        this.messageHandlers.forEach(handler => handler(message));
      });

      this.socket.on('user_typing', (data) => {
        console.log('Typing indicator:', data);
        this.typingHandlers.forEach(handler => handler(data));
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join conversation room
  joinConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('join_conversation', { conversation_id: conversationId });
    }
  }

  // Leave conversation room
  leaveConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('leave_conversation', { conversation_id: conversationId });
    }
  }

  // Send message via WebSocket
  sendMessage(data: SendMessageRequest): void {
    if (this.socket) {
      this.socket.emit('send_message', {
        conversation_id: data.conversation_id,
        content: data.content,
        message_type: data.message_type || 'text',
      });
    }
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('typing_start', { conversation_id: conversationId });
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('typing_stop', { conversation_id: conversationId });
    }
  }

  // Event handlers
  onMessage(handler: (message: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  onTyping(handler: (data: any) => void): void {
    this.typingHandlers.push(handler);
  }

  onConnection(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  // REST API methods
  async getConversations(): Promise<Conversation[]> {
    const token = authService.getToken();
    const response = await axios.get(`${API_BASE}/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data?.conversations ?? [];
  }

  async getConversationMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const token = authService.getToken();
    const response = await axios.get(
      `${API_BASE}/conversations/${conversationId}/messages?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data?.messages ?? [];
  }

  async sendMessageRest(data: SendMessageRequest): Promise<Message> {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_BASE}/conversations/${data.conversation_id}/messages`,
      {
        content: data.content,
        message_type: data.message_type || 'text',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    const token = authService.getToken();
    await axios.post(
      `${API_BASE}/conversations/${conversationId}/read`,
      { message_id: messageId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Create direct conversation with another user
  async createDirectConversation(targetUserId: string): Promise<{ conversation_id: string }> {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_BASE}/conversations/direct`,
      { target_user_id: targetUserId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  // Create group conversation
  async createGroupConversation(data: { name: string; participants: string[] }): Promise<{ conversation_id: string }> {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_BASE}/conversations/group`,
      {
        name: data.name,
        participants: data.participants,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  // List users (userIds) for starting a direct conversation
  async listUsers(): Promise<Array<{id: string, name: string, avatar_url?: string, user_type: string, is_online?: boolean}>> {
    const token = authService.getToken();
    const response = await axios.get(`${API_BASE}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data?.users ?? [];
  }
}

export const chatService = new ChatService();