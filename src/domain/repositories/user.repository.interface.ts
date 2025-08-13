import { User } from '@domain/entities/user.entity';

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  findByIds(userIds: string[]): Promise<User[]>;
  exists(userId: string): Promise<boolean>;
  save(user: User): Promise<User>;
  delete(userId: string): Promise<void>;
}

export interface IUserQueryRepository {
  findById(userId: string): Promise<User | null>;
  findByIds(userIds: string[]): Promise<User[]>;
  exists(userId: string): Promise<boolean>;
  findActiveUsers(userIds: string[]): Promise<User[]>;
}

export interface IUserCommandRepository {
  save(user: User): Promise<User>;
  delete(userId: string): Promise<void>;
  bulkSave(users: User[]): Promise<User[]>;
}