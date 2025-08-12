# Implementation Plan

- [x] 1. Set up scalable NestJS project architecture with clean design principles

  - Create NestJS project with layered architecture (presentation, application, domain, infrastructure layers)
  - Implement modular structure following Single Responsibility Principle (auth, chat, users, conversations modules)
  - Set up environment configuration using @nestjs/config with validation schemas and type safety
  - Configure JWT authentication strategy using Dependency Inversion Principle with abstract interfaces
  - Set up PostgreSQL database connection using TypeORM with connection pooling, read replicas support
  - Create TypeORM entities following Domain-Driven Design with proper aggregates and value objects
  - Implement database migration system with rollback capabilities and environment-specific configurations
  - Add comprehensive logging strategy with structured logging and correlation IDs
  - _Requirements: 6.1, 6.2, 9.1, 9.2, 9.3, 9.4_

- [ ] 2. Implement core data models and repositories

  - [x] 2.1 Create domain models following Domain-Driven Design principles

    - Define domain entities (User, Conversation, Participant, Message) with rich business logic
    - Create value objects for complex types (MessageContent, ConversationMetadata, UserProfile)
    - Implement domain events for cross-aggregate communication following Event-Driven Architecture
    - Create aggregate roots with proper encapsulation and invariant enforcement
    - Design DTOs with proper validation using class-validator and transformation decorators
    - Implement factory patterns for complex object creation with validation
    - _Requirements: 6.1, 6.2, 8.4_

  - [x] 2.2 Implement Repository pattern with CQRS separation

    - Create abstract IUserRepository interface following Interface Segregation Principle
    - Implement UserRepository with proper error handling and transaction management
    - Design separate command and query repositories for CQRS pattern implementation
    - Add repository decorators for caching, logging, and performance monitoring
    - Implement Unit of Work pattern for transaction consistency across aggregates
    - Create comprehensive unit tests with mocking and dependency injection
    - _Requirements: 6.1, 6.4_

  - [x] 2.3 Implement Conversation repository with relationship management

    - Create ConversationRepository with methods for creating conversations, managing participants
    - Implement conversation type-specific logic (direct, group, business)
    - Add methods for updating lastActivity and lastMessageId
    - Write unit tests for ConversationRepository operations
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 2.4 Implement Message repository with retention policies

    - Create MessageRepository with methods for storing, retrieving, and soft-deleting messages
    - Implement message pagination and conversation history loading
    - Add automatic 90-day retention policy with soft delete functionality
    - Write unit tests for message operations and retention logic
    - _Requirements: 1.1, 1.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 3. Set up basic Redis connection and simple caching

  - [x] 3.1 Implement basic Redis connection and cache service



    - Configure simple Redis connection with basic error handling
    - Create basic ICacheService interface for get/set/delete operations
    - Implement simple cache service with TTL support
    - Add basic Redis health check
    - Write unit tests for basic cache operations
    - _Requirements: 7.1, 7.2_

  - [x] 3.2 Create simple profile mock service



    - Create mock profile service that returns basic user/business profile data
    - Implement simple in-memory caching for profiles (no Redis yet)
    - Add basic profile data structure matching expected API format
    - Write unit tests for mock profile service
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 4. Implement basic real-time messaging



  - [ ] 4.1 Create basic WebSocket gateway

    - Implement simple WebSocket Gateway with basic authentication
    - Add connection management (connect/disconnect events)
    - Create basic message routing to conversation participants
    - Add simple error handling and connection cleanup
    - Write unit tests for WebSocket connection and basic messaging

    - _Requirements: 1.1, 1.4, 4.1, 4.2_

  - [x] 4.2 Implement basic message processing


    - Create simple MessageService for message validation and storage
    - Add basic message broadcasting to conversation participants
    - Implement simple message persistence using repositories
    - Add basic error handling for message processing
    - Write unit tests for message sending and receiving
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 5. Create basic REST API and test core functionality



  - [x] 5.1 Implement basic REST API endpoints


    - Create basic conversation endpoints (GET /conversations, POST /conversations)
    - Add basic message endpoints (GET /conversations/:id/messages, POST /conversations/:id/messages)
    - Implement simple JWT authentication middleware
    - Add basic input validation and error handling
    - Write unit tests for API endpoints
    - _Requirements: 1.1, 1.2, 2.1, 2.2_




  - [ ] 5.2 Create integration tests for core chat flow
    - Write integration tests for complete message sending flow (REST + WebSocket)
    - Test user-to-user chat functionality end-to-end
    - Test basic business chat functionality
    - Verify Redis connection and basic caching works
    - Test database operations and data persistence
    - _Requirements: All core requirements_

## ADVANCED FEATURES (Implement After Core System Works)

- [ ] 6. Add presence and typing indicators (LATER)

  - [ ] 6.1 Create presence tracking system

    - Implement PresenceService using Redis with 30-second TTL
    - Add user online/offline status updates via WebSocket heartbeats
    - Create presence broadcasting to relevant conversation participants
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 7.2_

  - [ ] 6.2 Implement typing indicators
    - Create TypingService for managing typing status with 5-second TTL
    - Add typing start/stop events via WebSocket
    - Implement typing indicator broadcasting to conversation participants
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 7. Create unread count and read receipt system (LATER)

  - [ ] 7.1 Implement unread count calculation

    - Create UnreadService for calculating and caching unread message counts
    - Add Redis-based unread count storage and real-time updates
    - Implement efficient unread count queries using message_id comparisons
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 7.4_

  - [ ] 7.2 Implement read receipt functionality
    - Add read status tracking in participants table (last_read_message_id)
    - Create read receipt broadcasting to message senders
    - Implement read status synchronization across user devices
    - _Requirements: 5.2, 5.3, 5.5_

- [ ] 8. Advanced conversation management (LATER)

  - [ ] 8.1 Implement advanced conversation features

    - Add participant management (add, remove, role changes)
    - Implement group chat creation with 8-participant limit
    - Add business chat creation with automatic agent assignment
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 8.2 Create chat list API with profile integration
    - Implement ChatListService for loading user's conversations with metadata
    - Add profile data integration using batch API and caching
    - Create efficient chat list queries with proper sorting by last_activity
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2_

- [ ] 9. Advanced business chat features (LATER)

  - [ ] 9.1 Create business chat routing and agent assignment

    - Implement BusinessChatService for handling business-to-user communications
    - Add automatic agent assignment logic based on availability
    - Create business hours checking and appropriate status messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 9.2 Add business-specific error handling
    - Implement "no agents available" queue management and user notifications
    - Add "business closed" status handling and appropriate UI messages
    - Create business chat escalation and priority handling
    - _Requirements: 3.2, 3.3, 10.1, 10.5_

- [ ] 10. Enterprise-grade scalability and monitoring (LATER)

  - [ ] 10.1 Implement scalable caching infrastructure

    - Configure Redis cluster support with failover and sharding capabilities
    - Implement Cache-Aside pattern with automatic cache warming and invalidation
    - Add distributed locking mechanism to prevent cache stampede scenarios
    - Implement Circuit Breaker pattern for Redis failures with graceful degradation
    - _Requirements: 7.1, 7.2, 7.5, 10.2_

  - [ ] 10.2 Add enterprise observability and resilience patterns

    - Create comprehensive health check system with dependency health aggregation
    - Implement Circuit Breaker pattern with configurable thresholds and recovery strategies
    - Add Bulkhead pattern to isolate critical resources and prevent cascade failures
    - Design retry mechanisms with exponential backoff and jitter for external calls
    - Implement distributed tracing with correlation IDs across service boundaries
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 10.3 Create scalable WebSocket infrastructure
    - Implement WebSocket Gateway with horizontal scaling support using Redis adapter
    - Design connection pool management with automatic load balancing and failover
    - Implement rate limiting per connection with sliding window algorithm
    - Add connection state management with proper cleanup and resource management
    - Write load tests for concurrent connection scenarios (10k+ connections)
    - _Requirements: 1.1, 1.4, 4.1, 4.2, 4.4_

- [ ] 11. Production deployment and documentation (LATER)

  - [ ] 11.1 Create production-ready deployment

    - Design multi-stage Docker builds with security scanning and minimal attack surface
    - Create Kubernetes manifests with proper resource limits, health checks, and scaling policies
    - Implement Infrastructure as Code using Helm charts with environment-specific values
    - Add monitoring and alerting configuration with SLA/SLO definitions
    - _Requirements: All requirements - deployment_

  - [ ] 11.2 Add comprehensive documentation and testing
    - Add comprehensive API documentation with interactive examples and SDK generation
    - Create comprehensive API testing suite with contract testing and load testing
    - Implement load testing for WebSocket connections and message throughput
    - Create tests for failure scenarios and recovery mechanisms
    - _Requirements: All requirements - comprehensive testing_
