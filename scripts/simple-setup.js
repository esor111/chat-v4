const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'chat_backend',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Drop existing tables to start fresh
    console.log('Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS messages CASCADE');
    await client.query('DROP TABLE IF EXISTS participants CASCADE');
    await client.query('DROP TABLE IF EXISTS conversations CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE users (
          user_id VARCHAR(255) PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create conversations table
    console.log('Creating conversations table...');
    await client.query(`
      CREATE TABLE conversations (
          conversation_id SERIAL PRIMARY KEY,
          type VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group', 'business')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_message_id INTEGER
      );
    `);

    // Create participants table
    console.log('Creating participants table...');
    await client.query(`
      CREATE TABLE participants (
          conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent', 'business', 'member', 'admin')),
          last_read_message_id INTEGER,
          is_muted BOOLEAN DEFAULT false,
          PRIMARY KEY (conversation_id, user_id)
      );
    `);

    // Create messages table
    console.log('Creating messages table...');
    await client.query(`
      CREATE TABLE messages (
          message_id SERIAL PRIMARY KEY,
          conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
          sender_id VARCHAR(255) REFERENCES users(user_id),
          content TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          type VARCHAR(20) DEFAULT 'text',
          deleted_at TIMESTAMPTZ
      );
    `);

    // Add foreign key constraint for last_message_id
    console.log('Adding foreign key constraints...');
    await client.query(`
      ALTER TABLE conversations 
      ADD CONSTRAINT fk_conversations_last_message 
      FOREIGN KEY (last_message_id) REFERENCES messages(message_id);
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX idx_conversations_last_activity ON conversations (last_activity DESC);`);
    await client.query(`CREATE INDEX idx_participants_user ON participants (user_id);`);
    await client.query(`CREATE INDEX idx_messages_convo_time ON messages (conversation_id, sent_at DESC);`);
    await client.query(`CREATE INDEX idx_messages_sender ON messages (sender_id);`);

    // Insert test data
    console.log('Inserting test data...');
    
    // Insert users
    await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['550e8400-e29b-41d4-a716-446655440002']);
    await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['550e8400-e29b-41d4-a716-446655440003']);

    // Insert conversations
    await client.query(`INSERT INTO conversations (conversation_id, type, created_at, last_activity) VALUES (1, 'direct', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes')`);
    await client.query(`INSERT INTO conversations (conversation_id, type, created_at, last_activity) VALUES (2, 'group', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes')`);
    await client.query(`INSERT INTO conversations (conversation_id, type, created_at, last_activity) VALUES (3, 'business', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes')`);

    // Insert participants
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (1, $1, 'member')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (1, $1, 'member')`, ['550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (2, $1, 'member')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (2, $1, 'member')`, ['550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (2, $1, 'admin')`, ['550e8400-e29b-41d4-a716-446655440002']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (3, $1, 'customer')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES (3, $1, 'business')`, ['550e8400-e29b-41d4-a716-446655440003']);

    // Insert messages
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (1, $1, 'Hello! How are you?', NOW() - INTERVAL '15 minutes', 'text')`, ['550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (1, $1, 'Hi there! I am doing great, thanks for asking.', NOW() - INTERVAL '10 minutes', 'text')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (1, $1, 'That is awesome to hear!', NOW() - INTERVAL '8 minutes', 'text')`, ['550e8400-e29b-41d4-a716-446655440001']);

    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (2, $1, 'Welcome to our group chat!', NOW() - INTERVAL '1 hour', 'text')`, ['550e8400-e29b-41d4-a716-446655440002']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (2, $1, 'Thanks for adding me to the group.', NOW() - INTERVAL '50 minutes', 'text')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (2, $1, 'Great to have you here!', NOW() - INTERVAL '45 minutes', 'text')`, ['550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (2, $1, 'Let us plan our next meeting.', NOW() - INTERVAL '5 minutes', 'text')`, ['550e8400-e29b-41d4-a716-446655440002']);

    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (3, $1, 'I need help with my order.', NOW() - INTERVAL '20 minutes', 'text')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (3, $1, 'Hello! I would be happy to help you with your order. What seems to be the issue?', NOW() - INTERVAL '15 minutes', 'text')`, ['550e8400-e29b-41d4-a716-446655440003']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (3, $1, 'I have not received my package yet.', NOW() - INTERVAL '10 minutes', 'text')`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES (3, $1, 'Let me check the tracking information for you.', NOW() - INTERVAL '2 minutes', 'text')`, ['550e8400-e29b-41d4-a716-446655440003']);

    // Update last_message_id for conversations
    console.log('Updating conversation metadata...');
    await client.query(`
      UPDATE conversations SET last_message_id = (
          SELECT message_id FROM messages 
          WHERE messages.conversation_id = conversations.conversation_id 
          ORDER BY sent_at DESC LIMIT 1
      );
    `);

    // Update last_activity for conversations
    await client.query(`
      UPDATE conversations SET last_activity = (
          SELECT sent_at FROM messages 
          WHERE messages.conversation_id = conversations.conversation_id 
          ORDER BY sent_at DESC LIMIT 1
      );
    `);

    // Display summary
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    const convCount = await client.query('SELECT COUNT(*) as count FROM conversations');
    const msgCount = await client.query('SELECT COUNT(*) as count FROM messages');

    console.log('\n=== Database Setup Completed Successfully! ===');
    console.log(`Users: ${userCount.rows[0].count}`);
    console.log(`Conversations: ${convCount.rows[0].count}`);
    console.log(`Messages: ${msgCount.rows[0].count}`);

  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await client.end();
  }
}

setupDatabase();