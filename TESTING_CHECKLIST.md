# Chat System Testing Checklist

Use this checklist to systematically test your chat system. Check off each item as you complete it.

## Pre-Testing Setup

### Environment Setup
- [ ] PostgreSQL is running and accessible
- [ ] Redis is running (optional but recommended)
- [ ] Node.js and npm are installed
- [ ] Environment variables are configured (.env file)
- [ ] Dependencies are installed (`npm install`)

### Database Setup
- [ ] Database exists and is accessible
- [ ] Migrations have been run (`npm run migration:run`)
- [ ] Test data has been inserted (`psql -d your_db -f scripts/setup-test-data.sql`)

### Application Build
- [ ] Application builds successfully (`npm run build`)
- [ ] No TypeScript compilation errors
- [ ] All dependencies resolve correctly

## Phase 1: Unit Tests

### Core Services Tests
- [ ] Profile mock service tests pass (`npm test -- --testPathPattern=profile-mock.service.spec.ts`)
- [ ] Profile cache service tests pass (`npm test -- --testPathPattern=simple-profile-cache.service.spec.ts`)
- [ ] Redis cache service tests pass (`npm test -- --testPathPattern=redis-cache.service.spec.ts`)
- [ ] WebSocket gateway tests pass (`npm test -- --testPathPattern=chat.gateway.spec.ts`)

### Domain Tests
- [ ] Entity tests pass (`npm test -- --testPathPattern=user.entity.spec.ts`)
- [ ] Value object tests pass (`npm test -- --testPathPattern=message-content.vo.spec.ts`)

### Integration Tests
- [ ] Core services integration tests pass (`npm test -- --testPathPattern=core-services.integration.spec.ts`)

## Phase 2: Application Startup

### Application Launch
- [ ] Application starts without errors (`npm run start:dev`)
- [ ] No critical errors in startup logs
- [ ] WebSocket Gateway initializes successfully
- [ ] Database connections are established
- [ ] Redis connections are attempted (errors OK if Redis not running)

### Port and Process Check
- [ ] Application is listening on port 3000
- [ ] Process is stable (no immediate crashes)
- [ ] Memory usage is reasonable

## Phase 3: Health Endpoints

### Basic Health Check
- [ ] `GET /api/health` returns 200 status
- [ ] Response contains `"status": "healthy"`
- [ ] Response includes timestamp and service info

### Detailed Health Check
- [ ] `GET /api/health/detailed` returns 200 status
- [ ] Response includes dependencies section
- [ ] Profile stats are present (users and businesses count)
- [ ] Redis status is reported (healthy or unhealthy)

### Redis Health Check
- [ ] `GET /api/health/redis` returns response
- [ ] Status reflects actual Redis connectivity
- [ ] Operations status is reported

### Automated Health Test
- [ ] Run system test script (`node scripts/test-system.js`)
- [ ] All health tests pass

## Phase 4: Profile System

### Mock Profile Data
- [ ] User profiles are available (IDs 1-5)
- [ ] Business profiles are available (IDs 100-103)
- [ ] Profile data includes required fields (name, avatar_url, user_type)
- [ ] Business profiles include business_hours

### Profile Caching
- [ ] Profiles are cached after first request
- [ ] Cache invalidation works
- [ ] Cache statistics are available
- [ ] Batch profile requests work

### Profile Integration
- [ ] Health endpoint shows correct profile counts
- [ ] Profile service integrates with cache service
- [ ] Error handling works for non-existent profiles

## Phase 5: Database Operations

### Database Connectivity
- [ ] Application connects to database successfully
- [ ] No connection pool errors in logs
- [ ] Database queries execute without errors

### Test Data Verification
- [ ] Users table has test data (users 1-5, 100-103)
- [ ] Conversations table has test conversations (IDs 1-5)
- [ ] Participants table has correct relationships
- [ ] Messages table has test messages
- [ ] Foreign key relationships are intact

### Repository Operations
- [ ] Can query users from database
- [ ] Can query conversations from database
- [ ] Can query messages from database
- [ ] Can query participants from database

## Phase 6: WebSocket Testing

### WebSocket Gateway
- [ ] WebSocket server is listening on `/chat` namespace
- [ ] Connections are accepted
- [ ] Authentication is required
- [ ] Unauthenticated connections are rejected

### WebSocket Functionality (Manual Testing Required)
- [ ] Can connect with valid JWT token
- [ ] Receives `connected` event after authentication
- [ ] Can join conversation rooms
- [ ] Can send messages
- [ ] Messages are broadcasted to room participants
- [ ] Typing indicators work
- [ ] Connection cleanup works on disconnect

### WebSocket Error Handling
- [ ] Invalid tokens are rejected
- [ ] Invalid message formats are handled
- [ ] Connection errors are logged
- [ ] No server crashes on malformed data

## Phase 7: REST API Testing

### Authentication
- [ ] Protected endpoints require JWT token
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Valid tokens allow access

### Conversation Endpoints
- [ ] `GET /api/conversations` returns user's conversations
- [ ] `GET /api/conversations/:id` returns conversation details
- [ ] `GET /api/conversations/:id/messages` returns messages
- [ ] `POST /api/conversations/:id/messages` sends messages
- [ ] `POST /api/conversations/:id/read` marks messages as read

### API Response Format
- [ ] All responses are valid JSON
- [ ] Error responses include proper status codes
- [ ] Success responses include expected data structure
- [ ] Profile data is included in conversation responses

### API Error Handling
- [ ] Non-existent conversations return 404
- [ ] Invalid message content returns 400
- [ ] Unauthorized access returns 401
- [ ] Server errors return 500 with proper error messages

## Phase 8: End-to-End Chat Flow

### User-to-User Chat
- [ ] User can connect via WebSocket
- [ ] User can join conversation
- [ ] User can send message via WebSocket
- [ ] Message appears in database
- [ ] Other participants receive message via WebSocket
- [ ] Message history is available via REST API
- [ ] Read status can be updated via REST API

### Business Chat Flow
- [ ] User can start business conversation
- [ ] Business agent can join conversation
- [ ] Messages flow between user and business
- [ ] Business profile data is displayed correctly
- [ ] Business hours information is available

### Group Chat Flow
- [ ] Multiple users can join group conversation
- [ ] Messages are broadcasted to all participants
- [ ] Participant roles are respected
- [ ] Muted participants don't receive notifications

## Phase 9: Cache System Testing

### Redis Cache (if Redis is running)
- [ ] Cache operations work (set, get, delete)
- [ ] TTL (time-to-live) works correctly
- [ ] Cache metrics are tracked
- [ ] Cache health is monitored

### Cache Fallback (if Redis is not running)
- [ ] Application doesn't crash when Redis is unavailable
- [ ] Cache operations fail gracefully
- [ ] Fallback mechanisms work
- [ ] Performance is acceptable without cache

### Profile Caching
- [ ] Profiles are cached after first request
- [ ] Cached profiles are returned on subsequent requests
- [ ] Cache invalidation works
- [ ] Batch profile caching works

## Phase 10: Performance Testing

### Basic Load Testing
- [ ] Application handles multiple simultaneous connections
- [ ] Database queries perform reasonably
- [ ] Memory usage is stable under load
- [ ] No memory leaks detected

### WebSocket Load Testing
- [ ] Multiple WebSocket connections work
- [ ] Message broadcasting scales reasonably
- [ ] Connection cleanup works under load
- [ ] No connection leaks

### API Load Testing
- [ ] Multiple simultaneous API requests work
- [ ] Response times are reasonable
- [ ] Database connection pool handles load
- [ ] No request timeouts under normal load

## Phase 11: Error Handling & Edge Cases

### Network Issues
- [ ] Database connection loss is handled gracefully
- [ ] Redis connection loss is handled gracefully
- [ ] WebSocket disconnections are handled properly
- [ ] API timeouts are handled correctly

### Data Validation
- [ ] Invalid message content is rejected
- [ ] SQL injection attempts are prevented
- [ ] XSS attempts are prevented
- [ ] Input sanitization works

### Edge Cases
- [ ] Empty conversations are handled
- [ ] Non-existent users are handled
- [ ] Deleted messages are handled
- [ ] Concurrent message sending works

## Phase 12: Logging & Monitoring

### Application Logs
- [ ] Startup logs are informative
- [ ] Error logs include stack traces
- [ ] Info logs track important operations
- [ ] Debug logs are available when needed

### Performance Monitoring
- [ ] Response times are logged
- [ ] Database query performance is monitored
- [ ] Memory usage is tracked
- [ ] Connection counts are monitored

### Error Tracking
- [ ] Errors are logged with context
- [ ] Critical errors are highlighted
- [ ] Error rates are trackable
- [ ] Error recovery is logged

## Phase 13: Security Testing

### Authentication Security
- [ ] JWT tokens are validated properly
- [ ] Expired tokens are rejected
- [ ] Token tampering is detected
- [ ] No sensitive data in tokens

### Authorization Security
- [ ] Users can only access their conversations
- [ ] Participants can only send messages to their conversations
- [ ] Admin roles are respected
- [ ] No unauthorized data access

### Input Security
- [ ] SQL injection is prevented
- [ ] XSS attacks are prevented
- [ ] Input validation is comprehensive
- [ ] File upload security (if applicable)

## Final Verification

### System Stability
- [ ] Application runs for extended period without crashes
- [ ] Memory usage is stable over time
- [ ] Database connections are stable
- [ ] No resource leaks detected

### Feature Completeness
- [ ] All core chat features work
- [ ] Real-time messaging works
- [ ] Message persistence works
- [ ] Profile integration works
- [ ] Caching works (with graceful fallback)

### Production Readiness
- [ ] Error handling is comprehensive
- [ ] Logging is adequate for debugging
- [ ] Performance is acceptable
- [ ] Security measures are in place
- [ ] Documentation is complete

## Test Results Summary

### Passed Tests: ___/___
### Failed Tests: ___/___
### Success Rate: ___%

### Critical Issues Found:
- [ ] None
- [ ] List any critical issues that must be fixed

### Minor Issues Found:
- [ ] None
- [ ] List any minor issues that should be addressed

### Recommendations:
- [ ] System is ready for production
- [ ] System needs minor fixes before production
- [ ] System needs major fixes before production

---

**Testing Completed By:** ________________  
**Date:** ________________  
**Environment:** ________________  
**Notes:** ________________