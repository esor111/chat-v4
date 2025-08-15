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

    // Enable UUID extension
    console.log('Enabling UUID extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create users table with UUID
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create conversations table with UUID
    console.log('Creating conversations table...');
    await client.query(`
      CREATE TABLE conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          type VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group', 'business')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_message_id UUID
      );
    `);

    // Create participants table with UUID
    console.log('Creating participants table...');
    await client.query(`
      CREATE TABLE participants (
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent', 'business', 'member', 'admin')),
          last_read_message_id UUID,
          is_muted BOOLEAN DEFAULT false,
          PRIMARY KEY (conversation_id, user_id)
      );
    `);

    // Create messages table with UUID
    console.log('Creating messages table...');
    await client.query(`
      CREATE TABLE messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id VARCHAR(255) REFERENCES users(user_id),
          content TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          type VARCHAR(20) DEFAULT 'text',
          deleted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add foreign key constraint for last_message_id
    console.log('Adding foreign key constraints...');
    await client.query(`
      ALTER TABLE conversations 
      ADD CONSTRAINT fk_conversations_last_message 
      FOREIGN KEY (last_message_id) REFERENCES messages(id);
    `);

    await client.query(`
      ALTER TABLE participants 
      ADD CONSTRAINT fk_participants_last_read_message 
      FOREIGN KEY (last_read_message_id) REFERENCES messages(id);
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

    // Insert conversations and get their UUIDs
    const conv1 = await client.query(`INSERT INTO conversations (type, created_at, last_activity) VALUES ('direct', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes') RETURNING id`);
    const conv2 = await client.query(`INSERT INTO conversations (type, created_at, last_activity) VALUES ('group', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes') RETURNING id`);
    const conv3 = await client.query(`INSERT INTO conversations (type, created_at, last_activity) VALUES ('business', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes') RETURNING id`);

    const conv1Id = conv1.rows[0].id;
    const conv2Id = conv2.rows[0].id;
    const conv3Id = conv3.rows[0].id;

    console.log('Created conversations:', { conv1Id, conv2Id, conv3Id });

    // Insert participants
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'member')`, [conv1Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'member')`, [conv1Id, '550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'member')`, [conv2Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'member')`, [conv2Id, '550e8400-e29b-41d4-a716-446655440001']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'admin')`, [conv2Id, '550e8400-e29b-41d4-a716-446655440002']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'customer')`, [conv3Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, 'business')`, [conv3Id, '550e8400-e29b-41d4-a716-446655440003']);

    // Insert messages and get their UUIDs
    const msg1 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Hello! How are you?', NOW() - INTERVAL '15 minutes', 'text') RETURNING id`, [conv1Id, '550e8400-e29b-41d4-a716-446655440001']);
    const msg2 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Hi there! I am doing great, thanks for asking.', NOW() - INTERVAL '10 minutes', 'text') RETURNING id`, [conv1Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    const msg3 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'That is awesome to hear!', NOW() - INTERVAL '8 minutes', 'text') RETURNING id`, [conv1Id, '550e8400-e29b-41d4-a716-446655440001']);

    const msg4 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Welcome to our group chat!', NOW() - INTERVAL '1 hour', 'text') RETURNING id`, [conv2Id, '550e8400-e29b-41d4-a716-446655440002']);
    const msg5 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Thanks for adding me to the group.', NOW() - INTERVAL '50 minutes', 'text') RETURNING id`, [conv2Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    const msg6 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Great to have you here!', NOW() - INTERVAL '45 minutes', 'text') RETURNING id`, [conv2Id, '550e8400-e29b-41d4-a716-446655440001']);
    const msg7 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Let us plan our next meeting.', NOW() - INTERVAL '5 minutes', 'text') RETURNING id`, [conv2Id, '550e8400-e29b-41d4-a716-446655440002']);

    const msg8 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'I need help with my order.', NOW() - INTERVAL '20 minutes', 'text') RETURNING id`, [conv3Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    const msg9 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Hello! I would be happy to help you with your order. What seems to be the issue?', NOW() - INTERVAL '15 minutes', 'text') RETURNING id`, [conv3Id, '550e8400-e29b-41d4-a716-446655440003']);
    const msg10 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'I have not received my package yet.', NOW() - INTERVAL '10 minutes', 'text') RETURNING id`, [conv3Id, 'afc70db3-6f43-4882-92fd-4715f25ffc95']);
    const msg11 = await client.query(`INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES ($1, $2, 'Let me check the tracking information for you.', NOW() - INTERVAL '2 minutes', 'text') RETURNING id`, [conv3Id, '550e8400-e29b-41d4-a716-446655440003']);

    // Update last_message_id for conversations
    console.log('Updating conversation metadata...');
    await client.query(`UPDATE conversations SET last_message_id = $1 WHERE id = $2`, [msg3.rows[0].id, conv1Id]);
    await client.query(`UPDATE conversations SET last_message_id = $1 WHERE id = $2`, [msg7.rows[0].id, conv2Id]);
    await client.query(`UPDATE conversations SET last_message_id = $1 WHERE id = $2`, [msg11.rows[0].id, conv3Id]);

    // Update last_activity for conversations
    await client.query(`
      UPDATE conversations SET last_activity = (
          SELECT sent_at FROM messages 
          WHERE messages.conversation_id = conversations.id 
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