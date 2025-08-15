import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestData1700000000002 implements MigrationInterface {
  name = 'SeedTestData1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert test users
    await queryRunner.query(`
      INSERT INTO users (user_id, created_at) VALUES 
      ('afc70db3-6f43-4882-92fd-4715f25ffc95', NOW()),
      ('c5c3d135-4968-450b-9fca-57f01e0055f7', NOW())
      ON CONFLICT (user_id) DO NOTHING;
    `);

    // Create a direct conversation between the two users
    const conversationId = '550e8400-e29b-41d4-a716-446655440000';
    await queryRunner.query(`
      INSERT INTO conversations (id, type, created_at, updated_at, last_activity) VALUES 
      ('${conversationId}', 'direct', NOW(), NOW(), NOW());
    `);

    // Add participants to the conversation
    await queryRunner.query(`
      INSERT INTO participants (conversation_id, user_id, role, is_muted) VALUES 
      ('${conversationId}', 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'member', false),
      ('${conversationId}', 'c5c3d135-4968-450b-9fca-57f01e0055f7', 'member', false);
    `);

    // Insert some test messages
    const message1Id = '550e8400-e29b-41d4-a716-446655440001';
    const message2Id = '550e8400-e29b-41d4-a716-446655440002';
    const message3Id = '550e8400-e29b-41d4-a716-446655440003';

    await queryRunner.query(`
      INSERT INTO messages (id, conversation_id, sender_id, content, type, sent_at, created_at, updated_at) VALUES 
      ('${message1Id}', '${conversationId}', 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'Hey Bhuwan! How are you doing?', 'text', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
      ('${message2Id}', '${conversationId}', 'c5c3d135-4968-450b-9fca-57f01e0055f7', 'Hi Ishwor! I''m doing great, thanks for asking. How about you?', 'text', NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 30 minutes'),
      ('${message3Id}', '${conversationId}', 'afc70db3-6f43-4882-92fd-4715f25ffc95', 'I''m good too! Want to test this chat system?', 'text', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour');
    `);

    // Update conversation with last message
    await queryRunner.query(`
      UPDATE conversations 
      SET last_message_id = '${message3Id}', 
          last_activity = NOW() - INTERVAL '1 hour'
      WHERE id = '${conversationId}';
    `);

    // Update participants with last read message (both have read all messages)
    await queryRunner.query(`
      UPDATE participants 
      SET last_read_message_id = '${message3Id}'
      WHERE conversation_id = '${conversationId}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove test data
    await queryRunner.query(`
      DELETE FROM participants WHERE conversation_id = '550e8400-e29b-41d4-a716-446655440000';
    `);
    
    await queryRunner.query(`
      DELETE FROM messages WHERE conversation_id = '550e8400-e29b-41d4-a716-446655440000';
    `);
    
    await queryRunner.query(`
      DELETE FROM conversations WHERE id = '550e8400-e29b-41d4-a716-446655440000';
    `);
    
    await queryRunner.query(`
      DELETE FROM users WHERE user_id IN (
        'afc70db3-6f43-4882-92fd-4715f25ffc95',
        'c5c3d135-4968-450b-9fca-57f01e0055f7'
      );
    `);
  }
}