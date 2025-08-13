-- Test Data Setup Script
-- Run this script to set up test data for the chat system
-- Usage: psql -d your_database_name -f scripts/setup-test-data.sql

-- Clean up existing test data (optional)
-- UUIDs we will use in this script
-- Users (provided)
--   User A: c5c3d135-4968-450b-9fca-57f01e0055f7
--   User B: afc70db3-6f43-4882-92fd-4715f25ffc95
-- Conversation (generated for test data)
--   Conv 1: 9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21

-- Remove existing rows for the same IDs (idempotent-ish)
DELETE FROM messages WHERE conversation_id IN ('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21');
DELETE FROM participants WHERE conversation_id IN ('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21');
DELETE FROM conversations WHERE id IN ('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21');
DELETE FROM users WHERE user_id IN (
  'c5c3d135-4968-450b-9fca-57f01e0055f7',
  'afc70db3-6f43-4882-92fd-4715f25ffc95'
);

-- Insert test users (regular users)
INSERT INTO users (user_id, created_at) VALUES 
('c5c3d135-4968-450b-9fca-57f01e0055f7', NOW()),
('afc70db3-6f43-4882-92fd-4715f25ffc95', NOW());

-- Insert test business users
-- Optional: add business users if needed. Commented out by default.
-- INSERT INTO users (user_id, created_at) VALUES 
-- ('2a5c5c2d-5a6b-4a2a-9b7e-2f5d6e7a8b9c', NOW()),
-- ('3b6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f', NOW());


-- Insert test conversations
INSERT INTO conversations (id, type, created_at, last_activity) VALUES 
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'direct', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour');

-- No sequence to reset; conversation IDs are UUIDs

-- Insert participants for the direct conversation (User A <-> User B)
INSERT INTO participants (conversation_id, user_id, role, is_muted, last_read_message_id) VALUES 
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'c5c3d135-4968-450b-9fca-57f01e0055f7', 'member', false, NULL),
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'member', false, NULL);

-- Additional conversations omitted for brevity. Add more UUIDs if needed.

-- Example for a group conversation would require an additional conversation UUID and user UUIDs.

-- Business conversation example omitted. Add business user UUIDs if you enable them above.

-- Business conversation example omitted.

-- Insert test messages for the direct conversation
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'c5c3d135-4968-450b-9fca-57f01e0055f7', 'Hello there!', NOW() - INTERVAL '2 hours', 'text'),
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'Hi! How are you?', NOW() - INTERVAL '1 hour 50 minutes', 'text'),
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'c5c3d135-4968-450b-9fca-57f01e0055f7', 'I''m doing great, thanks for asking!', NOW() - INTERVAL '1 hour 45 minutes', 'text'),
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'That''s wonderful to hear 😊', NOW() - INTERVAL '1 hour 30 minutes', 'text'),
('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21', 'c5c3d135-4968-450b-9fca-57f01e0055f7', 'What are you up to today?', NOW() - INTERVAL '1 hour', 'text');

-- Additional conversations omitted.

-- Additional conversations omitted.

-- Additional conversations omitted.

-- Additional conversations omitted.

-- Update last_message_id for conversations
UPDATE conversations SET last_message_id = (
  SELECT id FROM messages WHERE conversation_id = conversations.id ORDER BY sent_at DESC LIMIT 1
);

-- Update last_read_message_id for some participants (simulate read status)
UPDATE participants SET last_read_message_id = (
  SELECT id FROM messages WHERE conversation_id = participants.conversation_id ORDER BY sent_at DESC LIMIT 1
) WHERE conversation_id IN ('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21') AND user_id IN (
  'c5c3d135-4968-450b-9fca-57f01e0055f7',
  'afc70db3-6f43-4882-92fd-4715f25ffc95'
);

-- Skipped for now; only one conversation is inserted.

-- Display summary of test data
SELECT 'Test Data Summary' as info;
SELECT 'Users created:' as info, COUNT(*) as count FROM users;
SELECT 'Conversations created:' as info, COUNT(*) as count FROM conversations;
SELECT 'Participants created:' as info, COUNT(*) as count FROM participants;
SELECT 'Messages created:' as info, COUNT(*) as count FROM messages;

-- Display conversation details
SELECT 
  c.id as conversation_id,
  c.type,
  COUNT(p.user_id) as participant_count,
  COUNT(m.id) as message_count,
  c.last_activity
FROM conversations c
LEFT JOIN participants p ON c.id = p.conversation_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.id IN ('9f1b0c3e-9c0e-4a3b-9a52-3f7f2b1a8b21')
GROUP BY c.id, c.type, c.last_activity
ORDER BY c.id;

COMMIT;