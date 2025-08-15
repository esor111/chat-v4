import React, { useState } from 'react';
import { chatService } from '../services/chat.service';

interface GroupCreationProps {
  onGroupCreated: (conversationId: string) => void;
  onClose: () => void;
}

const GroupCreation: React.FC<GroupCreationProps> = ({ onGroupCreated, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addParticipant = () => {
    if (participants.length < 7) { // Max 8 total (including creator)
      setParticipants([...participants, '']);
    }
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, value: string) => {
    const updated = [...participants];
    updated[index] = value;
    setParticipants(updated);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    const validParticipants = participants.filter(p => p.trim());
    if (validParticipants.length === 0) {
      setError('Please add at least one participant');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await chatService.createGroupConversation({
        name: groupName.trim(),
        participants: validParticipants,
      });
      onGroupCreated(response.conversation_id);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      setError('Failed to create group. Please check participant IDs.');
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
        overflow: 'auto',
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Create Group Chat</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Group Name:
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Participants (KahaID or UserID):
          </label>
          {participants.map((participant, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={participant}
                onChange={(e) => updateParticipant(index, e.target.value)}
                placeholder="e.g., U-8C695E or user-id-here"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              />
              {participants.length > 1 && (
                <button
                  onClick={() => removeParticipant(index)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          {participants.length < 7 && (
            <button
              onClick={addParticipant}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              + Add Participant
            </button>
          )}
          
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
            Maximum 8 participants total (including you)
          </div>
        </div>

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

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
          <button
            onClick={handleCreateGroup}
            disabled={isLoading || !groupName.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading || !groupName.trim() ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading || !groupName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCreation;