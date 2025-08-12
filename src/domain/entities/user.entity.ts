import { Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;
}