import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '@domain/entities/user.entity';
import { IUserRepository, IUserQueryRepository, IUserCommandRepository } from '@domain/repositories/user.repository.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await this.repository.findOne({ where: { userId } });
      return user || null;
    } catch (error) {
      this.logger.error('Failed to find user by ID', error, {
        service: 'UserRepository',
        operation: 'findById',
        userId,
      });
      throw error;
    }
  }

  async findByIds(userIds: string[]): Promise<User[]> {
    try {
      if (userIds.length === 0) return [];
      return await this.repository.find({ where: { userId: In(userIds) } });
    } catch (error) {
      this.logger.error('Failed to find users by IDs', error, {
        service: 'UserRepository',
        operation: 'findByIds',
        userIds,
      });
      throw error;
    }
  }

  async exists(userId: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { userId } });
      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check user existence', error, {
        service: 'UserRepository',
        operation: 'exists',
        userId,
      });
      throw error;
    }
  }

  async save(user: User): Promise<User> {
    try {
      const savedUser = await this.repository.save(user);
      this.logger.debug('User saved successfully', {
        service: 'UserRepository',
        operation: 'save',
        userId: savedUser.userId,
      });
      return savedUser;
    } catch (error) {
      this.logger.error('Failed to save user', error, {
        service: 'UserRepository',
        operation: 'save',
        userId: user.userId,
      });
      throw error;
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.repository.delete({ userId });
      this.logger.debug('User deleted successfully', {
        service: 'UserRepository',
        operation: 'delete',
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete user', error, {
        service: 'UserRepository',
        operation: 'delete',
        userId,
      });
      throw error;
    }
  }
}

@Injectable()
export class UserQueryRepository implements IUserQueryRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await this.repository.findOne({ where: { userId } });
      return user || null;
    } catch (error) {
      this.logger.error('Failed to find user by ID', error, {
        service: 'UserQueryRepository',
        operation: 'findById',
        userId,
      });
      throw error;
    }
  }

  async findByIds(userIds: string[]): Promise<User[]> {
    try {
      if (userIds.length === 0) return [];
      return await this.repository.find({ where: { userId: In(userIds) } });
    } catch (error) {
      this.logger.error('Failed to find users by IDs', error, {
        service: 'UserQueryRepository',
        operation: 'findByIds',
        userIds,
      });
      throw error;
    }
  }

  async exists(userId: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { userId } });
      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check user existence', error, {
        service: 'UserQueryRepository',
        operation: 'exists',
        userId,
      });
      throw error;
    }
  }

  async findActiveUsers(userIds: string[]): Promise<User[]> {
    try {
      if (userIds.length === 0) return [];
      // In a real implementation, you might have an 'active' status field
      // For now, we'll just return all users
      return await this.repository.find({ where: { userId: In(userIds) } });
    } catch (error) {
      this.logger.error('Failed to find active users', error, {
        service: 'UserQueryRepository',
        operation: 'findActiveUsers',
        userIds,
      });
      throw error;
    }
  }
}

@Injectable()
export class UserCommandRepository implements IUserCommandRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async save(user: User): Promise<User> {
    try {
      const savedUser = await this.repository.save(user);
      this.logger.debug('User saved successfully', {
        service: 'UserCommandRepository',
        operation: 'save',
        userId: savedUser.userId,
      });
      return savedUser;
    } catch (error) {
      this.logger.error('Failed to save user', error, {
        service: 'UserCommandRepository',
        operation: 'save',
        userId: user.userId,
      });
      throw error;
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.repository.delete({ userId });
      this.logger.debug('User deleted successfully', {
        service: 'UserCommandRepository',
        operation: 'delete',
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete user', error, {
        service: 'UserCommandRepository',
        operation: 'delete',
        userId,
      });
      throw error;
    }
  }

  async bulkSave(users: User[]): Promise<User[]> {
    try {
      const savedUsers = await this.repository.save(users);
      this.logger.debug('Users bulk saved successfully', {
        service: 'UserCommandRepository',
        operation: 'bulkSave',
        count: savedUsers.length,
      });
      return savedUsers;
    } catch (error) {
      this.logger.error('Failed to bulk save users', error, {
        service: 'UserCommandRepository',
        operation: 'bulkSave',
        count: users.length,
      });
      throw error;
    }
  }
}