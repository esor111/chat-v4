import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { IUnitOfWork, ITransactionManager } from '@domain/repositories/unit-of-work.interface';
import { IUserCommandRepository } from '@domain/repositories/user.repository.interface';
import { IConversationCommandRepository } from '@domain/repositories/conversation.repository.interface';
import { IMessageCommandRepository } from '@domain/repositories/message.repository.interface';
import { IParticipantCommandRepository } from '@domain/repositories/participant.repository.interface';
import { UserCommandRepository } from './user.repository';
import { ConversationCommandRepository } from './conversation.repository';
import { MessageCommandRepository } from './message.repository';
import { ParticipantCommandRepository } from './participant.repository';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

export class UnitOfWork implements IUnitOfWork {
  public users: IUserCommandRepository;
  public conversations: IConversationCommandRepository;
  public messages: IMessageCommandRepository;
  public participants: IParticipantCommandRepository;

  private queryRunner: QueryRunner;
  private isTransactionActive = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: StructuredLoggerService,
  ) {
    this.queryRunner = this.dataSource.createQueryRunner();
    
    // Create repository instances with the query runner's manager
    this.users = new UserCommandRepository(
      this.queryRunner.manager.getRepository('User'),
      this.logger,
    );
    this.conversations = new ConversationCommandRepository(
      this.queryRunner.manager.getRepository('Conversation'),
      this.logger,
    );
    this.messages = new MessageCommandRepository(
      this.queryRunner.manager.getRepository('Message'),
      this.logger,
    );
    this.participants = new ParticipantCommandRepository(
      this.queryRunner.manager.getRepository('Participant'),
      this.logger,
    );
  }

  async begin(): Promise<void> {
    try {
      await this.queryRunner.connect();
      await this.queryRunner.startTransaction();
      this.isTransactionActive = true;
      
      this.logger.debug('Transaction started', {
        service: 'UnitOfWork',
        operation: 'begin',
      });
    } catch (error) {
      this.logger.error('Failed to start transaction', error, {
        service: 'UnitOfWork',
        operation: 'begin',
      });
      throw error;
    }
  }

  async commit(): Promise<void> {
    try {
      if (!this.isTransactionActive) {
        throw new Error('No active transaction to commit');
      }

      await this.queryRunner.commitTransaction();
      this.isTransactionActive = false;
      
      this.logger.debug('Transaction committed', {
        service: 'UnitOfWork',
        operation: 'commit',
      });
    } catch (error) {
      this.logger.error('Failed to commit transaction', error, {
        service: 'UnitOfWork',
        operation: 'commit',
      });
      throw error;
    } finally {
      await this.queryRunner.release();
    }
  }

  async rollback(): Promise<void> {
    try {
      if (!this.isTransactionActive) {
        throw new Error('No active transaction to rollback');
      }

      await this.queryRunner.rollbackTransaction();
      this.isTransactionActive = false;
      
      this.logger.debug('Transaction rolled back', {
        service: 'UnitOfWork',
        operation: 'rollback',
      });
    } catch (error) {
      this.logger.error('Failed to rollback transaction', error, {
        service: 'UnitOfWork',
        operation: 'rollback',
      });
      throw error;
    } finally {
      await this.queryRunner.release();
    }
  }

  isActive(): boolean {
    return this.isTransactionActive;
  }
}

@Injectable()
export class TransactionManager implements ITransactionManager {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: StructuredLoggerService,
  ) {}

  async executeInTransaction<T>(operation: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    const uow = new UnitOfWork(this.dataSource, this.logger);
    
    try {
      await uow.begin();
      
      this.logger.debug('Executing operation in transaction', {
        service: 'TransactionManager',
        operation: 'executeInTransaction',
      });

      const result = await operation(uow);
      await uow.commit();
      
      this.logger.debug('Transaction operation completed successfully', {
        service: 'TransactionManager',
        operation: 'executeInTransaction',
      });

      return result;
    } catch (error) {
      this.logger.error('Transaction operation failed, rolling back', error, {
        service: 'TransactionManager',
        operation: 'executeInTransaction',
      });

      if (uow.isActive()) {
        await uow.rollback();
      }
      throw error;
    }
  }
}