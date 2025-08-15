import React, { useState, useEffect } from 'react';
import { chatService } from '../services/chat.service';

interface UserSearchProps {
  onConversationCreated: (conversationId: string) => void;
  onClose: () => void;
}

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  user_type: string;
  is_online?: boolean;
}

const UserSearch: React.FC<UserSearchProps> = ({ onConversationCreated, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userList = await chatService.listUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = async (user: User) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await chatService.createDirectConversation(user.id);
      onConversationCreated(response.conversation_id);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Select User to Chat</h3>
        
        {error && (
          <div style={{
            color: '#d32f2f',
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '1rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '0.5rem'
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No users available</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: user.avatar_url ? 'transparent' : '#1976d2',
                  backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  marginRight: '1rem',
                }}>
                  {!user.avatar_url && user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    {user.user_type === 'business' ? 'Business' : 'User'}
                    {user.is_online && (
                      <span style={{ 
                        color: '#4caf50', 
                        marginLeft: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        ● Online
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSearch;