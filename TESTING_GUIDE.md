# Chat System Testing Guide

This guide provides a comprehensive testing sequence to verify that the entire chat system works correctly. Follow these steps in order to ensure all components are functioning properly.

## Prerequisites

Before starting the tests, ensure you have:

1. **PostgreSQL** running (for database operations)
2. **Redis** running (for caching - optional but recommended)
3. **Node.js** and **npm** installed
4. **Environment variables** configured

## Testing Sequence

### Phase 1: Infrastructure Setup & Health Checks

#### 1.1 Database Connection Test
```bash
# Build the application
npm run build

# Run database migrations
npm run migration:run

# Test database connectivity
npm test -- --testPathPattern=user.entity.spec.ts
```

**Expected Results:**
- ✅ Build completes successfully
- ✅ Migrations run without errors
- ✅ Entity tests pass (confirms TypeORM setup works)

#### 1.2 Redis Connection Test
```bash
# Test Redis connectivity
npm test -- --testPathPattern=redis-cache.service.spec.ts
```

**Expected Results:**
- ✅ Redis cache service tests pass
- ⚠️ Connection errors are OK if Redis is not running (graceful fallback)

#### 1.3 Core Services Test
```bash
# Test all core services integration
npm test -- --testPathPattern=core-services.integration.spec.ts
```

**Expected Results:**
- ✅ All service initialization tests pass
- ✅ Profile services work correctly
- ✅ Cache services handle Redis gracefully
- ✅ Error handling works properly

### Phase 2: Application Startup & Health Endpoints

#### 2.1 Start the Application
```bash
# Start the development server
npm run start:dev
```

**Expected Results:**
- ✅ Application starts without errors
- ✅ WebSocket Gateway initializes
- ✅ Database connections established
- ✅ Redis connections attempted (errors OK if Redis not running)

#### 2.2 Test Health Endpoints

**Basic Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "service": "chat-backend",
  "version": "1.0.0"
}
```

**Detailed Health Check:**
```bash
curl http://localhost:3000/api/health/detailed
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "service": "chat-backend",
  "version": "1.0.0",
  "dependencies": {
    "redis": {
      "status": "healthy" | "unhealthy",
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

**Redis-Specific Health:**
```bash
curl http://localhost:3000/api/health/redis
```

### Phase 3: Profile System Testing

#### 3.1 Test Profile Mock Service
```bash
# Test profile services
npm test -- --testPathPattern=profile-mock.service.spec.ts
npm test -- --testPathPattern=simple-profile-cache.service.spec.ts
```

**Expected Results:**
- ✅ Mock profiles are available
- ✅ User profiles (IDs 1-5) work
- ✅ Business profiles (IDs 100-103) work
- ✅ Batch profile requests work
- ✅ Caching works (in-memory)

#### 3.2 Manual Profile Testing
You can test profiles programmatically by creating a simple test script:

```javascript
// test-profiles.js
const { ProfileMockService } = require('./dist/infrastructure/profile/profile-mock.service');

async function testProfiles() {
  const profileService = new ProfileMockService();
  
  // Test user profile
  const user = await profileService.getUserProfile(1);
  console.log('User Profile:', user);
  
  // Test business profile
  const business = await profileService.getBusinessProfile(100);
  console.log('Business Profile:', business);
  
  // Test batch request
  const batch = await profileService.getBatchProfiles({
    user_ids: [1, 2],
    business_ids: [100, 101]
  });
  console.log('Batch Profiles:', batch);
}

testProfiles();
```

### Phase 4: WebSocket Testing

#### 4.1 Test WebSocket Gateway
```bash
# Test WebSocket functionality
npm test -- --testPathPattern=chat.gateway.spec.ts
```

**Expected Results:**
- ✅ WebSocket gateway initializes
- ✅ Authentication works
- ✅ Room management works
- ✅ Message broadcasting works

#### 4.2 Manual WebSocket Testing

**Using a WebSocket client (like wscat):**
```bash
# Install wscat if you don't have it
npm install -g wscat

# Connect to WebSocket (replace with actual JWT token)
wscat -c "ws://localhost:3000/chat" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Or using browser JavaScript:**
```javascript
// In browser console
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('connected', (data) => {
  console.log('Authentication successful:', data);
});

// Join a conversation
socket.emit('join_conversation', { conversation_id: 123 });

// Send a message
socket.emit('send_message', {
  conversation_id: 123,
  content: 'Hello world!',
  message_type: 'text'
});

// Listen for messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

### Phase 5: REST API Testing

#### 5.1 Authentication Setup
First, you'll need a JWT token. For testing, you can create a simple token or use the auth system if implemented.

#### 5.2 Test Conversation Endpoints

**Get Conversations (Chat List):**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/conversations
```

**Get Conversation Details:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/conversations/123
```

**Get Conversation Messages:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/conversations/123/messages?limit=50
```

**Send Message:**
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content": "Hello world!", "message_type": "text"}' \
     http://localhost:3000/api/conversations/123/messages
```

**Mark Messages as Read:**
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message_id": 456}' \
     http://localhost:3000/api/conversations/123/read
```

### Phase 6: Database Integration Testing

#### 6.1 Test Database Operations
```bash
# Test all repository operations
npm test -- --testPathPattern=repository
```

#### 6.2 Manual Database Testing

**Check if tables exist:**
```sql
-- Connect to your PostgreSQL database
\dt

-- Should show tables: users, conversations, participants, messages
```

**Test data insertion:**
```sql
-- Insert test user
INSERT INTO users (user_id) VALUES (1);

-- Insert test conversation
INSERT INTO conversations (type) VALUES ('direct');

-- Check data
SELECT * FROM users;
SELECT * FROM conversations;
```

### Phase 7: End-to-End Chat Flow Testing

#### 7.1 Complete User Chat Flow

**Step 1: Setup Test Data**
```sql
-- Insert test users
INSERT INTO users (user_id) VALUES (1), (2);

-- Insert test conversation
INSERT INTO conversations (type, created_at, last_activity) 
VALUES ('direct', NOW(), NOW());

-- Get the conversation ID (let's say it's 1)
-- Insert participants
INSERT INTO participants (conversation_id, user_id, role) 
VALUES (1, 1, 'member'), (1, 2, 'member');
```

**Step 2: Test Complete Flow**
1. **Connect via WebSocket** (as user 1)
2. **Join conversation** (conversation_id: 1)
3. **Send message** via WebSocket
4. **Verify message received** by other participants
5. **Fetch messages** via REST API
6. **Mark messages as read** via REST API

#### 7.2 Business Chat Flow

**Step 1: Setup Business Data**
```sql
-- Insert business user
INSERT INTO users (user_id) VALUES (100);

-- Insert business conversation
INSERT INTO conversations (type, created_at, last_activity) 
VALUES ('business', NOW(), NOW());

-- Insert participants (user + business)
INSERT INTO participants (conversation_id, user_id, role) 
VALUES (2, 1, 'customer'), (2, 100, 'business');
```

**Step 2: Test Business Flow**
1. **User connects** and joins business conversation
2. **Business agent connects** and joins conversation
3. **Exchange messages** between user and business
4. **Test business hours** and availability
5. **Verify profile data** shows business information

### Phase 8: Performance & Load Testing

#### 8.1 Cache Performance
```bash
# Test cache operations
npm test -- --testPathPattern=cache-example.service
```

#### 8.2 WebSocket Load Testing
```javascript
// simple-load-test.js
const io = require('socket.io-client');

async function loadTest() {
  const connections = [];
  const numConnections = 10;
  
  for (let i = 0; i < numConnections; i++) {
    const socket = io('http://localhost:3000/chat', {
      auth: { token: 'test-token' }
    });
    
    socket.on('connect', () => {
      console.log(`Connection ${i} established`);
      socket.emit('join_conversation', { conversation_id: 1 });
    });
    
    connections.push(socket);
  }
  
  // Send messages from each connection
  setTimeout(() => {
    connections.forEach((socket, i) => {
      socket.emit('send_message', {
        conversation_id: 1,
        content: `Message from connection ${i}`,
        message_type: 'text'
      });
    });
  }, 2000);
}

loadTest();
```

### Phase 9: Error Handling Testing

#### 9.1 Test Error Scenarios

**Invalid JWT Token:**
```bash
curl -H "Authorization: Bearer invalid-token" \
     http://localhost:3000/api/conversations
# Expected: 401 Unauthorized
```

**Non-existent Conversation:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/conversations/99999
# Expected: 404 Not Found
```

**Invalid Message Content:**
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content": "", "message_type": "text"}' \
     http://localhost:3000/api/conversations/123/messages
# Expected: 400 Bad Request
```

#### 9.2 Test Service Failures

**Redis Down Scenario:**
1. Stop Redis service
2. Test health endpoints (should show Redis as unhealthy)
3. Test cache operations (should fallback gracefully)
4. Test WebSocket and API (should still work)

**Database Connection Issues:**
1. Test with invalid database credentials
2. Verify error handling and logging
3. Check application doesn't crash

### Phase 10: Monitoring & Logging

#### 10.1 Check Logs
```bash
# Monitor application logs
tail -f logs/application.log

# Look for:
# - Connection events
# - Message processing
# - Error handling
# - Performance metrics
```

#### 10.2 Monitor System Resources
```bash
# Check memory usage
ps aux | grep node

# Check network connections
netstat -an | grep 3000

# Check database connections
# (depends on your PostgreSQL setup)
```

## Expected Test Results Summary

### ✅ Success Criteria

1. **Infrastructure:**
   - Application starts without errors
   - Database connections work
   - Redis connections work (or fail gracefully)

2. **Health Endpoints:**
   - All health checks return proper status
   - Dependencies are monitored correctly

3. **Profile System:**
   - Mock profiles are available
   - Caching works properly
   - Batch requests work

4. **WebSocket System:**
   - Connections authenticate properly
   - Room management works
   - Messages broadcast correctly

5. **REST API:**
   - All endpoints respond correctly
   - Authentication works
   - Data validation works
   - Error handling is proper

6. **Database Integration:**
   - Data persists correctly
   - Relationships work
   - Queries perform well

7. **End-to-End Flows:**
   - Complete chat flows work
   - Business chat scenarios work
   - Real-time updates work

### ⚠️ Acceptable Issues

1. **Redis connection errors** (if Redis not running)
2. **Some test timeouts** (due to network latency)
3. **JWT token issues** (if auth not fully implemented)

### ❌ Critical Issues

1. **Application won't start**
2. **Database connection failures**
3. **WebSocket gateway crashes**
4. **API endpoints return 500 errors**
5. **Data corruption or loss**

## Troubleshooting Common Issues

### Database Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep your_database_name

# Run migrations
npm run migration:run
```

### Redis Issues
```bash
# Check if Redis is running
redis-cli ping

# Start Redis (if needed)
redis-server
```

### Port Issues
```bash
# Check if port 3000 is available
lsof -i :3000

# Kill process using port 3000
kill -9 $(lsof -t -i:3000)
```

### JWT Token Issues
For testing, you can create a simple JWT token:
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: 1, name: 'Test User' }, 'your-secret-key');
console.log(token);
```

This comprehensive testing guide ensures your chat system is fully functional and ready for production use!