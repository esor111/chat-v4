-- Create database schema and test data for chat system

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group', 'business')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_id INTEGER
);

CREATE TABLE IF NOT EXISTS participants (
    conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent', 'business', 'member', 'admin')),
    last_read_message_id INTEGER,
    is_muted BOOLEAN DEFAULT false,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id VARCHAR(255) REFERENCES users(user_id),
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(20) DEFAULT 'text',
    deleted_at TIMESTAMPTZ
);

-- Add foreign key constraint for last_message_id
ALTER TABLE conversations 
ADD CONSTRAINT fk_conversations_last_message 
FOREIGN KEY (last_message_id) REFERENCES messages(message_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations (last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo_time ON messages (conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);

-- Insert test users (using the actual user ID from the JWT token)
INSERT INTO users (user_id) VALUES 
    ('afc70db3-6f43-4882-92fd-4715f25ffc95'),  -- Your actual user ID from JWT
    ('test-user-2'),
    ('test-user-3'),
    ('test-business-1')
ON CONFLICT (user_id) DO NOTHING;

-- Insert test conversations
INSERT INTO conversations (type, created_at, last_activity) VALUES 
    ('direct', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes'),
    ('group', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes'),
    ('business', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes')
ON CONFLICT DO NOTHING;

-- Insert participants
INSERT INTO participants (conversation_id, user_id, role) VALUES 
    (1, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'member'),
    (1, 'test-user-2', 'member'),
    (2, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'member'),
    (2, 'test-user-2', 'member'),
    (2, 'test-user-3', 'admin'),
    (3, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'customer'),
    (3, 'test-business-1', 'business')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Insert test messages
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
    (1, 'test-user-2', 'Hello! How are you?', NOW() - INTERVAL '15 minutes', 'text'),
    (1, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'Hi there! I am doing great, thanks for asking.', NOW() - INTERVAL '10 minutes', 'text'),
    (1, 'test-user-2', 'That is awesome to hear!', NOW() - INTERVAL '8 minutes', 'text'),
    
    (2, 'test-user-3', 'Welcome to our group chat!', NOW() - INTERVAL '1 hour', 'text'),
    (2, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'Thanks for adding me to the group.', NOW() - INTERVAL '50 minutes', 'text'),
    (2, 'test-user-2', 'Great to have you here!', NOW() - INTERVAL '45 minutes', 'text'),
    (2, 'test-user-3', 'Let us plan our next meeting.', NOW() - INTERVAL '5 minutes', 'text'),
    
    (3, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'I need help with my order.', NOW() - INTERVAL '20 minutes', 'text'),
    (3, 'test-business-1', 'Hello! I would be happy to help you with your order. What seems to be the issue?', NOW() - INTERVAL '15 minutes', 'text'),
    (3, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'I have not received my package yet.', NOW() - INTERVAL '10 minutes', 'text'),
    (3, 'test-business-1', 'Let me check the tracking information for you.', NOW() - INTERVAL '2 minutes', 'text')
ON CONFLICT DO NOTHING;

-- Update last_message_id for conversations
UPDATE conversations SET last_message_id = (
    SELECT message_id FROM messages 
    WHERE messages.conversation_id = conversations.conversation_id 
    ORDER BY sent_at DESC LIMIT 1
);

-- Update last_activity for conversations
UPDATE conversations SET last_activity = (
    SELECT sent_at FROM messages 
    WHERE messages.conversation_id = conversations.conversation_id 
    ORDER BY sent_at DESC LIMIT 1
);

-- Display summary
SELECT 'Database setup completed successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as conversation_count FROM conversations;
SELECT COUNT(*) as message_count FROM messages;