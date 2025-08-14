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

    // Create tables
    console.log('Creating tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          user_id VARCHAR(255) PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
          conversation_id SERIAL PRIMARY KEY,
          type VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group', 'business')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_message_id INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
          conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent', 'business', 'member', 'admin')),
          last_read_message_id INTEGER,
          is_muted BOOLEAN DEFAULT false,
          PRIMARY KEY (conversation_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
          message_id SERIAL PRIMARY KEY,
          conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
          sender_id VARCHAR(255) REFERENCES users(user_id),
          content TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          type VARCHAR(20) DEFAULT 'text',
          deleted_at TIMESTAMPTZ
      );
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations (last_activity DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_participants_user ON participants (user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_convo_time ON messages (conversation_id, sent_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);`);

    // Insert test data
    console.log('Inserting test data...');
    
    // Insert users (using proper UUIDs)
    try {
      await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);
    } catch (e) { /* ignore if exists */ }
    try {
      await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['550e8400-e29b-41d4-a716-446655440001']);
    } catch (e) { /* ignore if exists */ }
    try {
      await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['550e8400-e29b-41d4-a716-446655440002']);
    } catch (e) { /* ignore if exists */ }
    try {
      await client.query(`INSERT INTO users (user_id) VALUES ($1)`, ['550e8400-e29b-41d4-a716-446655440003']);
    } catch (e) { /* ignore if exists */ }

    // Insert conversations
    const convResult = await client.query(`
      INSERT INTO conversations (type, created_at, last_activity) VALUES 
          ('direct', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes'),
          ('group', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes'),
          ('business', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes')
      RETURNING conversation_id;
    `);

    console.log('Created conversations:', convResult.rows);

    // Insert participants
    const participants = [
      [1, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'member'],
      [1, '550e8400-e29b-41d4-a716-446655440001', 'member'],
      [2, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'member'],
      [2, '550e8400-e29b-41d4-a716-446655440001', 'member'],
      [2, '550e8400-e29b-41d4-a716-446655440002', 'admin'],
      [3, 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'customer'],
      [3, '550e8400-e29b-41d4-a716-446655440003', 'business']
    ];
    
    for (const [convId, userId, role] of participants) {
      try {
        await client.query(`INSERT INTO participants (conversation_id, user_id, role) VALUES ($1, $2, $3)`, [convId, userId, role]);
      } catch (e) { /* ignore if exists */ }
    }

    // Insert messages
    await client.query(`
      INSERT INTO messages (conversation_id, sender_id, content, sent_at, type) VALUES 
          (1, '550e8400-e29b-41d4-a716-446655440001', 'Hello! How are you?', NOW() - INTERVAL '15 minutes', 'text'),
          (1, $1, 'Hi there! I am doing great, thanks for asking.', NOW() - INTERVAL '10 minutes', 'text'),
          (1, '550e8400-e29b-41d4-a716-446655440001', 'That is awesome to hear!', NOW() - INTERVAL '8 minutes', 'text'),
          
          (2, '550e8400-e29b-41d4-a716-446655440002', 'Welcome to our group chat!', NOW() - INTERVAL '1 hour', 'text'),
          (2, $1, 'Thanks for adding me to the group.', NOW() - INTERVAL '50 minutes', 'text'),
          (2, '550e8400-e29b-41d4-a716-446655440001', 'Great to have you here!', NOW() - INTERVAL '45 minutes', 'text'),
          (2, '550e8400-e29b-41d4-a716-446655440002', 'Let us plan our next meeting.', NOW() - INTERVAL '5 minutes', 'text'),
          
          (3, $1, 'I need help with my order.', NOW() - INTERVAL '20 minutes', 'text'),
          (3, '550e8400-e29b-41d4-a716-446655440003', 'Hello! I would be happy to help you with your order. What seems to be the issue?', NOW() - INTERVAL '15 minutes', 'text'),
          (3, $1, 'I have not received my package yet.', NOW() - INTERVAL '10 minutes', 'text'),
          (3, '550e8400-e29b-41d4-a716-446655440003', 'Let me check the tracking information for you.', NOW() - INTERVAL '2 minutes', 'text');
    `, ['afc70db3-6f43-4882-92fd-4715f25ffc95']);

    // Update last_message_id for conversations
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