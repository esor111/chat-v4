export const CONVERSATION_CONSTANTS = {
  MAX_PARTICIPANTS: 7,
  MAX_MESSAGE_LENGTH: 4000,
  DEFAULT_MESSAGE_LIMIT: 50,
  MAX_MESSAGE_LIMIT: 100,
  DEFAULT_CONVERSATION_LIMIT: 20,
  MAX_CONVERSATION_LIMIT: 100,
} as const;

export const WEBSOCKET_CONSTANTS = {
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 60000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
} as const;

export const CACHE_CONSTANTS = {
  PROFILE_TTL: 300, // 5 minutes
  CONVERSATION_TTL: 600, // 10 minutes
  MESSAGE_TTL: 3600, // 1 hour
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
} as const;

export const CONVERSATION_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

export const PARTICIPANT_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy',
} as const;