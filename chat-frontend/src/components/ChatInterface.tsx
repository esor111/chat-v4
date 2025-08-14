import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chat.service';
import type { Message, Conversation } from '../types/chat';

const ChatInterface: React.FC = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
    return () => {
      chatService.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // Connect to WebSocket
      await chatService.connect();
      
      // Set up event handlers
      chatService.onConnection(setIsConnected);
      chatService.onMessage(handleNewMessage);
      
      // Load conversations
      await loadConversations();
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setError('Failed to connect to chat server');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await chatService.getConversations();
      setConversations(convs);
      
      // Auto-select first conversation if available
      if (convs.length > 0 && !selectedConversation) {
        selectConversation(convs[0].conversation_id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    }
  };

  const selectConversation = async (conversationId: number) => {
    try {
      setSelectedConversation(conversationId);
      setMessages([]);
      
      // Leave previous conversation
      if (selectedConversation) {
        chatService.leaveConversation(selectedConversation);
      }
      
      // Join new conversation
      chatService.joinConversation(conversationId);
      
      // Load messages
      const msgs = await chatService.getConversationMessages(conversationId);
      setMessages(msgs);
      
    } catch (error) {
      console.error('Failed to select conversation:', error);
      setError('Failed to load conversation messages');
    }
  };

  const handleNewMessage = (message: Message) => {
    if (message.conversation_id === selectedConversation) {
      setMessages(prev => [...prev, message]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send via WebSocket for real-time delivery
      chatService.sendMessage({
        conversation_id: selectedConversation,
        content: messageContent,
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading chat...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '300px', 
        backgroundColor: '#f5f5f5', 
        borderRight: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#1976d2', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>Chat</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {user?.kahaId || user?.id}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: isConnected ? '#4caf50' : '#f44336' 
            }} />
            <button 
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.conversation_id}
                onClick={() => selectConversation(conv.conversation_id)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedConversation === conv.conversation_id ? '#e3f2fd' : 'white'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  Conversation {conv.conversation_id}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  {conv.type} • {formatTime(conv.last_activity)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'white', 
              borderBottom: '1px solid #ddd',
              fontWeight: 'bold'
            }}>
              Conversation {selectedConversation}
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '1rem',
              backgroundColor: '#fafafa'
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.message_id}
                    style={{
                      marginBottom: '1rem',
                      display: 'flex',
                      justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: message.sender_id === user?.id ? '#1976d2' : 'white',
                        color: message.sender_id === user?.id ? 'white' : 'black',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div>{message.content}</div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        opacity: 0.7, 
                        marginTop: '0.25rem' 
                      }}>
                        {formatTime(message.sent_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'white', 
              borderTop: '1px solid #ddd',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: newMessage.trim() ? '#1976d2' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: '#666'
          }}>
            Select a conversation to start chatting
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#f44336',
          color: 'white',
          padding: '1rem',
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              marginLeft: '1rem',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;