import { User } from '@domain/entities/user.entity';

export interface IUserRepository {
  findById(userId: number): Promise<User | null>;
  findByIds(userIds: number[]): Promise<User[]>;
  exists(userId: number): Promise<boolean>;
  save(user: User): Promise<User>;
  delete(userId: number): Promise<void>;
}

export interface IUserQueryRepository {
  findById(userId: number): Promise<User | null>;
  findByIds(userIds: number[]): Promise<User[]>;
  exists(userId: number): Promise<boolean>;
  findActiveUsers(userIds: number[]): Promise<User[]>;
}

export interface IUserCommandRepository {
  save(user: User): Promise<User>;
  delete(userId: number): Promise<void>;
  bulkSave(users: User[]): Promise<User[]>;
}