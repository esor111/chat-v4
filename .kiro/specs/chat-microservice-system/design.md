# Design Document

## Overview

The chat microservice system is designed as a scalable, real-time messaging platform that serves as a dedicated chat service while integrating with the existing kaha-main-v3 user service. The system follows microservice architecture principles with clear separation of concerns, where kaha-main-v3 remains the single source of truth for user profiles, and chat-backend handles all messaging, real-time features, and chat-specific data.

The architecture leverages PostgreSQL for persistent data storage, Redis for caching and real-time state management, and WebSocket connections for real-time communication. The system is designed to handle 50k-100k concurrent users with sub-100ms response times for core operations.

## Architecture

### System Context Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│  kaha-main-v3   │◄─────►│  chat-backend   │◄─────►│     Clients     │
│ (User Service)  │       │ (Chat Service)  │       │ (Web/Mobile)    │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         ▲                          ▲                          
         │                          │                          
         ▼                          ▼                          
┌─────────────────┐       ┌─────────────────┐                  
│                 │       │                 │                  
│   User DB       │       │   Chat DB       │                  
│ (kaha-main-v3)  │       │ (chat-backend)  │                  
│                 │       │                 │                  
└─────────────────┘       └─────────────────┘                  
```

### Data Flow Architecture

The system implements a clear data ownership model:

- **kaha-main-v3**: Owns user profiles, business profiles, and user-business relationships
- **chat-backend**: Owns conversations, messages, participants, and real-time state
- **Redis**: Caches profile data and manages real-time features (presence, queues, unread counts)

### Integration Patterns

1. **Batch Profile API**: chat-backend fetches user/business profiles via a single batch API call
2. **Event-Driven Cache Invalidation**: Profile updates trigger cache invalidation events
3. **Stale-While-Revalidate**: Serves cached data during kaha-main-v3 downtime
4. **WebSocket Real-Time**: Direct WebSocket connections for instant messaging and presence

## Components and Interfaces

### Core Components

#### 1. Chat Service Layer
- **Message Handler**: Processes incoming messages, validates participants, stores in database
- **Conversation Manager**: Creates and manages conversation metadata, participant lists
- **Real-Time Coordinator**: Manages WebSocket connections, presence tracking, typing indicators

#### 2. Profile Integration Layer
- **Batch Profile Client**: Interfaces with kaha-main-v3 batch API
- **Profile Cache Manager**: Handles Redis caching with TTL and invalidation
- **Event Listener**: Processes profile update events from kaha-main-v3

#### 3. Real-Time Engine
- **WebSocket Manager**: Handles connection lifecycle, authentication, heartbeats
- **Presence Service**: Tracks online/offline status with 30-second TTL
- **Message Queue Service**: Manages offline message delivery via Redis lists

#### 4. Database Access Layer
- **Conversation Repository**: CRUD operations for conversations and participants
- **Message Repository**: Message storage, retrieval, and retention policies
- **User Repository**: Minimal user mapping (user_id only, no profile data)

### External Interfaces

#### kaha-main-v3 Integration

**Batch Profile API**
```http
POST /api/batch/profiles
Authorization: Bearer <SERVICE_TOKEN>
Content-Type: application/json

{
  "user_ids": [123, 456, 789],
  "business_ids": [500, 600]
}
```

**Response Format**
```json
{
  "users": [
    {
      "id": 123,
      "name": "Ishwor Thapa",
      "avatar_url": "https://cdn.example.com/users/123.jpg",
      "user_type": "user"
    }
  ],
  "businesses": [
    {
      "id": 500,
      "name": "Nike Nepal",
      "avatar_url": "https://cdn.example.com/businesses/500.png",
      "is_online": true
    }
  ]
}
```

**Profile Update Events**
```json
// user.profile.updated
{ "id": 123 }

// business.profile.updated  
{ "id": 500 }
```

#### Client WebSocket API

**Connection & Authentication**
```javascript
const ws = new WebSocket('wss://chat.example.com/ws');
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token_here'
}));
```

**Message Sending**
```javascript
ws.send(JSON.stringify({
  type: 'message',
  conversation_id: 123,
  content: 'Hello world',
  message_type: 'text'
}));
```

**Real-Time Events**
```javascript
// Incoming message
{
  type: 'message',
  conversation_id: 123,
  message_id: 456,
  sender_id: 789,
  content: 'Hello world',
  sent_at: '2023-01-01T12:00:00Z'
}

// Presence update
{
  type: 'presence',
  user_id: 789,
  status: 'online'
}

// Typing indicator
{
  type: 'typing',
  conversation_id: 123,
  user_id: 789,
  is_typing: true
}
```

## Data Models

### PostgreSQL Schema

#### Core Tables

**users**
```sql
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,  -- Foreign key to kaha-main-v3
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**conversations**
```sql
CREATE TABLE conversations (
  conversation_id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group', 'business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_id INTEGER REFERENCES messages(message_id)
);
```

**participants**
```sql
CREATE TABLE participants (
  conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent', 'business', 'member', 'admin')),
  last_read_message_id INTEGER REFERENCES messages(message_id),
  is_muted BOOLEAN DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)
);
```

**messages**
```sql
CREATE TABLE messages (
  message_id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(user_id),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type VARCHAR(20) DEFAULT 'text',
  deleted_at TIMESTAMPTZ
);
```

#### Critical Indexes

```sql
-- Chat list performance
CREATE INDEX idx_conversations_last_activity ON conversations (last_activity DESC);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_id);

-- User's conversations
CREATE INDEX idx_participants_user ON participants (user_id);
CREATE INDEX idx_participants_last_read ON participants (last_read_message_id);

-- Message retrieval
CREATE INDEX idx_messages_convo_time ON messages (conversation_id, sent_at DESC);
CREATE INDEX idx_messages_convo_id ON messages (conversation_id, message_id);
```

### Redis Data Structures

#### Profile Caching
```redis
# User profiles (24h TTL)
HSET profile:user:123 name "Ishwor Thapa" avatar_url "https://..."

# Business profiles (24h TTL)  
HSET profile:business:500 name "Nike Nepal" avatar_url "https://..."

# Stale markers (5m TTL)
SET profile:stale:user:123 "1" EX 300
```

#### Real-Time State
```redis
# Presence tracking (30s TTL)
SETEX presence:123 30 "online"

# Typing indicators (5s TTL)
SETEX typing:456:123 5 "1"

# Message queues (no TTL)
RPUSH queue:123 10001 10002 10003

# Unread counts (no TTL)
SET unread:123:456 "3"

# Chat list cache (no TTL)
ZADD convo_list:123 1625000000 789
```

## Error Handling

### Failure Scenarios and Responses

#### kaha-main-v3 Unavailable
- **Response**: Serve stale cached profiles for up to 24 hours
- **Fallback**: Display "Unknown User" for missing profiles
- **Recovery**: Automatic retry with exponential backoff

#### Redis Unavailable  
- **Response**: Fall back to direct database queries
- **Impact**: Increased latency but continued functionality
- **Recovery**: Automatic reconnection and cache rebuild

#### Database Connection Failure
- **Response**: Retry with exponential backoff (max 3 attempts)
- **Fallback**: Return appropriate HTTP error codes
- **Recovery**: Connection pool management with health checks

#### Partial Profile Data
- **Response**: Use available data, log warnings for missing fields
- **Display**: Show partial information rather than failing completely
- **Monitoring**: Alert on high rates of partial data responses

### Error Response Format

```json
{
  "error": {
    "code": "PROFILE_SERVICE_UNAVAILABLE",
    "message": "Unable to fetch user profiles",
    "details": "kaha-main-v3 service is temporarily unavailable",
    "retry_after": 30
  }
}
```

### Circuit Breaker Pattern

Implement circuit breakers for external service calls:
- **Closed**: Normal operation, requests pass through
- **Open**: Service unavailable, immediate fallback responses  
- **Half-Open**: Testing recovery, limited requests allowed

## Testing Strategy

### Unit Testing
- **Repository Layer**: Mock database interactions, test CRUD operations
- **Service Layer**: Mock external dependencies, test business logic
- **Cache Layer**: Test Redis operations, TTL behavior, fallback scenarios
- **WebSocket Handler**: Test connection lifecycle, message routing

### Integration Testing
- **Database Integration**: Test with real PostgreSQL instance
- **Redis Integration**: Test caching behavior, expiration, failover
- **kaha-main-v3 Integration**: Test batch API calls, event handling
- **End-to-End Message Flow**: Test complete message delivery pipeline

### Performance Testing
- **Load Testing**: Simulate 50k concurrent WebSocket connections
- **Stress Testing**: Test system behavior under extreme load
- **Database Performance**: Test query performance with large datasets
- **Cache Performance**: Test Redis throughput and memory usage

### Real-Time Testing
- **WebSocket Reliability**: Test connection drops, reconnection logic
- **Message Ordering**: Ensure messages arrive in correct sequence
- **Presence Accuracy**: Test online/offline status updates
- **Cross-Device Sync**: Test message sync across multiple devices

### Test Data Management
- **Profile Mock Data**: Simulate various user/business profile scenarios
- **Message Datasets**: Generate realistic conversation patterns
- **Load Simulation**: Create realistic user behavior patterns
- **Edge Case Data**: Test with malformed, missing, or extreme data

### Monitoring and Observability
- **Metrics Collection**: Track message throughput, latency, error rates
- **Health Checks**: Monitor service dependencies and database connections
- **Alerting**: Set up alerts for critical failures and performance degradation
- **Logging**: Structured logging for debugging and audit trails

The testing strategy ensures the system meets performance requirements while maintaining reliability and data consistency across all failure scenarios.