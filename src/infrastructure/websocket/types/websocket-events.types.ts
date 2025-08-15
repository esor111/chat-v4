// Client to Server Events
export interface ClientToServerEvents {
  join_conversation: (data: JoinRoomPayload) => void;
  leave_conversation: (data: JoinRoomPayload) => void;
  send_message: (data: MessagePayload) => void;
  typing_start: (data: TypingPayload) => void;
  typing_stop: (data: TypingPayload) => void;
  mark_as_read: (data: MarkAsReadPayload) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  connected: (data: ConnectionConfirmation) => void;
  joined_conversation: (data: ConversationJoinedEvent) => void;
  left_conversation: (data: ConversationLeftEvent) => void;
  new_message: (data: NewMessageEvent) => void;
  message_sent: (data: MessageSentConfirmation) => void;
  message_error: (data: MessageErrorEvent) => void;
  user_typing: (data: TypingEvent) => void;
  message_read: (data: MessageReadEvent) => void;
  marked_as_read: (data: MarkedAsReadEvent) => void;
  conversation_history: (data: ConversationHistoryEvent) => void;
  user_joined_conversation: (data: UserJoinedEvent) => void;
  join_error: (data: JoinErrorEvent) => void;
  error: (data: ErrorEvent) => void;
}

// Event Payload Types
export interface JoinRoomPayload {
  conversation_id: string;
}

export interface MessagePayload {
  conversation_id: string;
  content: string;
  message_type?: string;
}

export interface TypingPayload {
  conversation_id: string;
}

export interface MarkAsReadPayload {
  conversation_id: string;
  message_id: string;
}

// Event Response Types
export interface ConnectionConfirmation {
  message: string;
  userId: string;
}

export interface ConversationJoinedEvent {
  conversation_id: string;
  message: string;
  timestamp: string;
}

export interface ConversationLeftEvent {
  conversation_id: string;
  message: string;
}

export interface NewMessageEvent {
  message_id: string | number;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: string;
  sent_at: string;
}

export interface MessageSentConfirmation {
  message_id: string;
  conversation_id: string;
  sent_at: string;
  status: 'delivered' | 'failed';
}

export interface MessageErrorEvent {
  message: string;
  conversation_id: string;
  timestamp: string;
  error?: string;
}

export interface TypingEvent {
  conversation_id: string;
  user_id: string;
  user_name?: string;
  is_typing: boolean;
  timestamp: string;
}

export interface MessageReadEvent {
  conversation_id: string;
  user_id: string;
  message_id: string;
  timestamp: string;
}

export interface MarkedAsReadEvent {
  conversation_id: string;
  message_id: string;
  timestamp: string;
}

export interface ConversationHistoryEvent {
  conversation_id: string;
  messages: any[]; // Should be typed based on your message structure
}

export interface UserJoinedEvent {
  conversation_id: string;
  user_id: string;
  user_name?: string;
  timestamp: string;
}

export interface JoinErrorEvent {
  message: string;
  conversation_id: string;
}

export interface ErrorEvent {
  message: string;
  error?: string;
}