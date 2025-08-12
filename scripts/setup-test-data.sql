-- Test Data Setup Script
-- Run this script to set up test data for the chat system
-- Usage: psql -d your_database_name -f scripts/setup-test-data.sql

-- Clean up existing test data (optional)
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE id BETWEEN 1 AND 10);
DELETE FROM participants WHERE conversation_id BETWEEN 1 AND 10;
DELETE FROM conversations WHERE id BETWEEN 1 AND 10;
DELETE FROM users WHERE user_id BETWEEN 1 AND 200;

-- Insert test users (regular users)
INSERT INTO users (user_id, created_at) VALUES 
(1, NOW()),
(2, NOW()),
(3, NOW()),
(4, NOW()),
(5, NOW());

-- Insert test business users
INSERT INTO users (user_id, created_at) VALUES 
(100, NOW()),
(101, NOW()),
(102, NOW()),
(103, NOW());

-- Insert test conversations
INSERT INTO conversations (id, type, created_at, last_activity) VALUES 
(1, 'direct', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
(2, 'direct', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours'),
(3, 'group', NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 minutes'),
(4, 'business', NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 minutes'),
(5, 'business', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- Reset sequence for conversations (if using serial)
SELECT setval('conversations_id_seq', 10, true);

-- Insert participants for direct conversation (User 1 <-> User 2)
INSERT INTO participants (conversation_id, user_id, role, is_muted, last_read_message_id) VALUES 
(1, 1, 'member', false, NULL),
(1, 2, 'member', false, NULL);

-- Insert participants for another direct conversation (User 1 <-> User 3)
INSERT INTO participants (conversation_id, user_id, role, is_muted, last_read_message_id) VALUES 
(2, 1, 'member', false, NULL),
(2, 3, 'member', false, NULL);

-- Insert participants for group conversation (Users 1, 2, 3, 4)
INSERT INTO participants (conversation_id, user_id, role, is_muted, last_read_message_id) VALUES 
(3, 1, 'admin', false, NULL),
(3, 2, 'member', false, NULL),
(3, 3, 'member', false, NULL),
(3, 4, 'member', true, NULL); -- User 4 has muted this conversation

-- Insert participants for business conversation (User 1 <-> Business 100)
INSERT INTO participants (conversation_id, user_id, role, is_muted, last_read_message_id) VALUES 
(4, 1, 'customer', false, NULL),
(4, 100, 'business', false, NULL);

-- Insert participants for another business conversation (User 2 <-> Business 101)
INSERT INTO participants (conversation_id, user_id, role, is_muted, last_read_message_id) VALUES 
(5, 2, 'customer', false, NULL),
(5, 101, 'business', false, NULL);

-- Insert test messages for conversation 1 (User 1 <-> User 2)
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
(1, 1, 'Hello there!', NOW() - INTERVAL '2 hours', 'text'),
(1, 2, 'Hi! How are you?', NOW() - INTERVAL '1 hour 50 minutes', 'text'),
(1, 1, 'I''m doing great, thanks for asking!', NOW() - INTERVAL '1 hour 45 minutes', 'text'),
(1, 2, 'That''s wonderful to hear 😊', NOW() - INTERVAL '1 hour 30 minutes', 'text'),
(1, 1, 'What are you up to today?', NOW() - INTERVAL '1 hour', 'text');

-- Insert test messages for conversation 2 (User 1 <-> User 3)
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
(2, 1, 'Hey, are we still meeting tomorrow?', NOW() - INTERVAL '3 hours', 'text'),
(2, 3, 'Yes, absolutely! Same time and place.', NOW() - INTERVAL '2 hours 30 minutes', 'text'),
(2, 1, 'Perfect, see you then!', NOW() - INTERVAL '2 hours', 'text');

-- Insert test messages for group conversation (Users 1, 2, 3, 4)
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
(3, 1, 'Welcome everyone to our project group!', NOW() - INTERVAL '1 day', 'text'),
(3, 2, 'Thanks for setting this up!', NOW() - INTERVAL '23 hours', 'text'),
(3, 3, 'Excited to work together 🚀', NOW() - INTERVAL '22 hours', 'text'),
(3, 1, 'Let''s schedule our first meeting', NOW() - INTERVAL '21 hours', 'text'),
(3, 4, 'I''m available Monday through Wednesday', NOW() - INTERVAL '20 hours', 'text'),
(3, 2, 'Monday works for me too', NOW() - INTERVAL '19 hours', 'text'),
(3, 1, 'Great! Monday at 2 PM it is.', NOW() - INTERVAL '30 minutes', 'text');

-- Insert test messages for business conversation (User 1 <-> Business 100)
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
(4, 1, 'Hi, I have a question about your product', NOW() - INTERVAL '2 hours', 'text'),
(4, 100, 'Hello! I''d be happy to help. What would you like to know?', NOW() - INTERVAL '1 hour 55 minutes', 'text'),
(4, 1, 'I''m interested in the premium features. Can you tell me more?', NOW() - INTERVAL '1 hour 50 minutes', 'text'),
(4, 100, 'Certainly! Our premium features include...', NOW() - INTERVAL '1 hour 45 minutes', 'text'),
(4, 1, 'That sounds great! How much does it cost?', NOW() - INTERVAL '1 hour 30 minutes', 'text'),
(4, 100, 'The premium plan is $29/month. Would you like to upgrade?', NOW() - INTERVAL '15 minutes', 'text');

-- Insert test messages for another business conversation (User 2 <-> Business 101)
INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
(5, 2, 'I need help with my recent order', NOW() - INTERVAL '1 day', 'text'),
(5, 101, 'I''m sorry to hear you''re having issues. Can you provide your order number?', NOW() - INTERVAL '23 hours', 'text'),
(5, 2, 'Sure, it''s #12345', NOW() - INTERVAL '22 hours', 'text'),
(5, 101, 'Thank you. I see your order here. What seems to be the problem?', NOW() - INTERVAL '21 hours', 'text');

-- Update last_message_id for conversations
UPDATE conversations SET last_message_id = (
  SELECT id FROM messages WHERE conversation_id = conversations.id ORDER BY sent_at DESC LIMIT 1
);

-- Update last_read_message_id for some participants (simulate read status)
UPDATE participants SET last_read_message_id = (
  SELECT id FROM messages WHERE conversation_id = participants.conversation_id ORDER BY sent_at DESC LIMIT 1
) WHERE conversation_id IN (1, 2) AND user_id IN (1, 2, 3);

-- Leave some messages unread in group and business conversations
UPDATE participants SET last_read_message_id = (
  SELECT id FROM messages WHERE conversation_id = participants.conversation_id ORDER BY sent_at ASC LIMIT 1
) WHERE conversation_id IN (3, 4, 5);

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
WHERE c.id BETWEEN 1 AND 10
GROUP BY c.id, c.type, c.last_activity
ORDER BY c.id;

COMMIT;