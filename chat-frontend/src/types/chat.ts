export interface Message {
  message_id: number;
  conversation_id: number;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: string;
  sent_at: string;
}

export interface Conversation {
  conversation_id: number;
  type: 'direct' | 'group' | 'business';
  created_at: string;
  last_activity: string;
  last_message?: Message;
  participants?: Participant[];
  unread_count?: number;
}

export interface Participant {
  user_id: string;
  role: 'customer' | 'agent' | 'business' | 'member' | 'admin';
  last_read_message_id?: number;
  is_muted: boolean;
}

export interface SendMessageRequest {
  conversation_id: number;
  content: string;
  message_type?: string;
}

export interface TypingIndicator {
  conversation_id: number;
  user_id: string;
  user_name?: string;
  is_typing: boolean;
}