import { IUserCommandRepository } from './user.repository.interface';
import { IConversationCommandRepository } from './conversation.repository.interface';
import { IMessageCommandRepository } from './message.repository.interface';
import { IParticipantCommandRepository } from './participant.repository.interface';

export interface IUnitOfWork {
  users: IUserCommandRepository;
  conversations: IConversationCommandRepository;
  messages: IMessageCommandRepository;
  participants: IParticipantCommandRepository;

  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export interface ITransactionManager {
  executeInTransaction<T>(operation: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
}