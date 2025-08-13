import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class UuidMigration1700000000001 implements MigrationInterface {
  name = 'UuidMigration1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Drop existing tables (this will lose data)
    await queryRunner.dropTable('participants', true, true, true);
    await queryRunner.dropTable('messages', true, true, true);
    await queryRunner.dropTable('conversations', true, true, true);
    await queryRunner.dropTable('users', true, true, true);

    // Create users table with UUID
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // Create conversations table with UUID
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'last_activity',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'last_message_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create messages table with UUID
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'sender_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'sent_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'text'",
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create participants table with UUID
    await queryRunner.createTable(
      new Table({
        name: 'participants',
        columns: [
          {
            name: 'conversation_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'last_read_message_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_muted',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    // Add constraints
    await queryRunner.query(`
      ALTER TABLE conversations 
      ADD CONSTRAINT chk_conversation_type 
      CHECK (type IN ('direct', 'group', 'business'))
    `);

    await queryRunner.query(`
      ALTER TABLE participants 
      ADD CONSTRAINT chk_participant_role 
      CHECK (role IN ('customer', 'agent', 'business', 'member', 'admin'))
    `);

    await queryRunner.query(`
      ALTER TABLE messages 
      ADD CONSTRAINT chk_message_type 
      CHECK (type IN ('text', 'image', 'file', 'system'))
    `);

    // Create foreign keys
    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['last_message_id'],
        referencedTableName: 'messages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['conversation_id'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['user_id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['conversation_id'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['user_id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['last_read_message_id'],
        referencedTableName: 'messages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create performance indexes
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'idx_conversations_last_activity',
        columnNames: ['last_activity'],
      }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'idx_conversations_last_message',
        columnNames: ['last_message_id'],
      }),
    );

    await queryRunner.createIndex(
      'participants',
      new TableIndex({
        name: 'idx_participants_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'participants',
      new TableIndex({
        name: 'idx_participants_last_read',
        columnNames: ['last_read_message_id'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_messages_convo_time',
        columnNames: ['conversation_id', 'sent_at'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_messages_convo_id',
        columnNames: ['conversation_id', 'id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('participants');
    await queryRunner.dropTable('messages');
    await queryRunner.dropTable('conversations');
    await queryRunner.dropTable('users');
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}