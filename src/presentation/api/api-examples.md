# Chat API Examples

This document shows how to use the Chat API endpoints.

## Authentication

All API endpoints (except health checks) require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Health Check Endpoints

### Basic Health Check
```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "service": "chat-backend",
  "version": "1.0.0"
}
```

### Detailed Health Check
```http
GET /api/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "service": "chat-backend",
  "version": "1.0.0",
  "dependencies": {
    "redis": {
      "status": "healthy",
      "latency": 10,
      "operations": {
        "set": true,
        "get": true,
        "delete": true
      }
    },
    "profiles": {
      "status": "healthy",
      "total_users": 5,
      "total_businesses": 4,
      "online_users": 3,
      "online_businesses": 2
    }
  }
}
```

### Redis Health Check
```http
GET /api/health/redis
```

## Conversation Endpoints

### Get User's Conversations (Chat List)
```http
GET /api/conversations?limit=20&offset=0
Authorization: Bearer <token>
```

Response:
```json
{
  "conversations": [
    {
      "conversation_id": 123,
      "type": "direct",
      "last_activity": "2023-01-01T12:00:00.000Z",
      "last_message_id": 456,
      "participants": [
        {
          "userId": 2,
          "role": "member",
          "name": "John Doe",
          "avatar_url": "https://example.com/avatar.jpg",
          "user_type": "user"
        }
      ],
      "unread_count": 3,
      "is_muted": false
    }
  ],
  "total": 5
}
```

### Get Conversation Details
```http
GET /api/conversations/123
Authorization: Bearer <token>
```

Response:
```json
{
  "conversation_id": 123,
  "type": "direct",
  "created_at": "2023-01-01T10:00:00.000Z",
  "last_activity": "2023-01-01T12:00:00.000Z",
  "last_message_id": 456,
  "participants": [
    {
      "userId": 1,
      "role": "member",
      "name": "Current User",
      "avatar_url": "https://example.com/avatar1.jpg",
      "user_type": "user",
      "is_muted": false,
      "last_read_message_id": 450
    },
    {
      "userId": 2,
      "role": "member",
      "name": "John Doe",
      "avatar_url": "https://example.com/avatar2.jpg",
      "user_type": "user",
      "is_muted": false,
      "last_read_message_id": 456
    }
  ]
}
```

### Get Conversation Messages
```http
GET /api/conversations/123/messages?limit=50&before_message_id=456
Authorization: Bearer <token>
```

Response:
```json
{
  "messages": [
    {
      "message_id": 456,
      "conversation_id": 123,
      "sender_id": 2,
      "sender_name": "John Doe",
      "sender_avatar": "https://example.com/avatar2.jpg",
      "content": "Hello there!",
      "message_type": "text",
      "sent_at": "2023-01-01T12:00:00.000Z",
      "is_deleted": false
    },
    {
      "message_id": 455,
      "conversation_id": 123,
      "sender_id": 1,
      "sender_name": "Current User",
      "sender_avatar": "https://example.com/avatar1.jpg",
      "content": "Hi!",
      "message_type": "text",
      "sent_at": "2023-01-01T11:59:00.000Z",
      "is_deleted": false
    }
  ],
  "has_more": true
}
```

### Send Message
```http
POST /api/conversations/123/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello world!",
  "message_type": "text"
}
```

Response:
```json
{
  "message": {
    "messageId": 457,
    "conversationId": 123,
    "senderId": 1,
    "content": "Hello world!",
    "messageType": "text",
    "sentAt": "2023-01-01T12:01:00.000Z"
  }
}
```

### Mark Messages as Read
```http
POST /api/conversations/123/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "message_id": 456
}
```

Response:
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Message content cannot be empty",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Conversation not found or access denied",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Failed to fetch conversations",
  "error": "Internal Server Error"
}
```

## WebSocket Integration

The REST API works alongside the WebSocket gateway. When you send a message via the REST API, it will also be broadcasted to connected WebSocket clients in real-time.

### Typical Flow:
1. **Connect to WebSocket** for real-time updates
2. **Fetch conversations** via REST API to get chat list
3. **Fetch messages** via REST API to get conversation history
4. **Send messages** via REST API (also broadcasts via WebSocket)
5. **Receive real-time messages** via WebSocket
6. **Mark messages as read** via REST API

This hybrid approach gives you the best of both worlds:
- **REST API** for reliable data fetching and sending
- **WebSocket** for real-time updates and notifications