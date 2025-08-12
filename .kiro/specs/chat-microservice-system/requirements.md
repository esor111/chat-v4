# Requirements Document

## Introduction

This document outlines the requirements for a chat microservice system (chat-backend) that provides real-time messaging capabilities for a platform serving 50k-100k users. The system will handle 1:1 messaging, small group chats (max 8 participants), and business-to-user communications while integrating with an existing user service (kaha-main-v3). The system includes Redis-based caching for profiles and real-time features like presence indicators, typing indicators, read receipts, and unread counts.

## Requirements

### Requirement 1

**User Story:** As a user, I want to send and receive messages in real-time with other users, so that I can have instant conversations.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the system SHALL deliver it to the recipient within 100ms if they are online
2. WHEN a user is offline THEN the system SHALL queue messages for delivery when they come online
3. WHEN a message is sent THEN the system SHALL store it in the database with a timestamp
4. WHEN a user connects THEN the system SHALL deliver all queued messages immediately
5. IF a user has multiple devices THEN the system SHALL sync messages across all devices

### Requirement 2

**User Story:** As a user, I want to create and participate in group chats with up to 8 people, so that I can communicate with multiple people simultaneously.

#### Acceptance Criteria

1. WHEN a user creates a group chat THEN the system SHALL allow adding up to 8 participants maximum
2. WHEN a message is sent to a group THEN the system SHALL deliver it to all active participants
3. WHEN a user joins a group THEN the system SHALL show them the conversation history
4. WHEN a user leaves a group THEN the system SHALL remove them from future message delivery
5. IF a group has an admin THEN the system SHALL allow them to add/remove participants

### Requirement 3

**User Story:** As a user, I want to communicate with businesses through dedicated chat channels, so that I can get customer support and make inquiries.

#### Acceptance Criteria

1. WHEN a user initiates business chat THEN the system SHALL create a 3-participant conversation (user, business, agent)
2. WHEN no agents are available THEN the system SHALL queue the message and notify the user
3. WHEN business hours are closed THEN the system SHALL display appropriate status message
4. WHEN an agent is assigned THEN the system SHALL add them to the existing conversation
5. IF agent transfer occurs THEN the system SHALL maintain conversation continuity

### Requirement 4

**User Story:** As a user, I want to see real-time presence indicators and typing notifications, so that I know when others are active and responding.

#### Acceptance Criteria

1. WHEN a user comes online THEN the system SHALL update their presence status within 30 seconds
2. WHEN a user starts typing THEN the system SHALL show typing indicator to other participants within 1 second
3. WHEN a user stops typing THEN the system SHALL remove typing indicator after 5 seconds
4. WHEN a user goes offline THEN the system SHALL update presence status after 30 seconds of inactivity
5. IF multiple users are typing THEN the system SHALL show aggregated typing indicator

### Requirement 5

**User Story:** As a user, I want to see unread message counts and read receipts, so that I can track which messages I've seen and which conversations need attention.

#### Acceptance Criteria

1. WHEN a user receives a message THEN the system SHALL increment unread count for that conversation
2. WHEN a user reads messages THEN the system SHALL mark them as read and reset unread count
3. WHEN a message is read THEN the system SHALL show read receipt to the sender
4. WHEN displaying chat list THEN the system SHALL show accurate unread counts for each conversation
5. IF a user has multiple devices THEN the system SHALL sync read status across devices

### Requirement 6

**User Story:** As a system administrator, I want user profiles to be managed by the existing user service (kaha-main-v3), so that there is a single source of truth for user data.

#### Acceptance Criteria

1. WHEN displaying user information THEN the system SHALL fetch profiles from kaha-main-v3 via batch API
2. WHEN user profiles are updated THEN the system SHALL invalidate cached profile data within 1 second
3. WHEN kaha-main-v3 is unavailable THEN the system SHALL serve stale cached profiles for up to 24 hours
4. WHEN building UI responses THEN the system SHALL batch profile requests to minimize API calls
5. IF profile data is missing THEN the system SHALL display "Unknown User" placeholder

### Requirement 7

**User Story:** As a system administrator, I want Redis caching for profiles and real-time data, so that the system can handle high load with fast response times.

#### Acceptance Criteria

1. WHEN user profiles are requested THEN the system SHALL cache them in Redis for 24 hours
2. WHEN real-time presence data is updated THEN the system SHALL store it in Redis with 30-second TTL
3. WHEN message queues are needed THEN the system SHALL use Redis lists for offline message delivery
4. WHEN unread counts are calculated THEN the system SHALL cache results in Redis for instant access
5. IF Redis fails THEN the system SHALL fall back to direct database queries without blocking UI

### Requirement 8

**User Story:** As a system administrator, I want automatic message retention policies, so that storage costs are controlled and old data is cleaned up.

#### Acceptance Criteria

1. WHEN messages are 90 days old THEN the system SHALL soft delete them by setting deleted_at timestamp
2. WHEN messages are soft deleted for 7 days THEN the system SHALL permanently delete them from database
3. WHEN retention cleanup runs THEN the system SHALL process deletions in batches to avoid performance impact
4. WHEN messages are deleted THEN the system SHALL maintain conversation metadata and participant lists
5. IF retention policy changes THEN the system SHALL apply new rules to existing messages

### Requirement 9

**User Story:** As a system administrator, I want comprehensive database indexing and optimization, so that the system performs well under high load.

#### Acceptance Criteria

1. WHEN loading chat lists THEN the system SHALL use last_activity index for sub-100ms response times
2. WHEN calculating unread counts THEN the system SHALL use participant last_read indexes for efficiency
3. WHEN loading chat history THEN the system SHALL use conversation_id + sent_at indexes for fast pagination
4. WHEN searching conversations THEN the system SHALL use optimized indexes to avoid full table scans
5. IF database performance degrades THEN the system SHALL maintain response times under 200ms for core operations

### Requirement 10

**User Story:** As a system administrator, I want proper error handling and fallback mechanisms, so that the system remains available even when dependencies fail.

#### Acceptance Criteria

1. WHEN kaha-main-v3 is unavailable THEN the system SHALL serve cached profile data and continue operating
2. WHEN Redis is unavailable THEN the system SHALL fall back to database queries for real-time features
3. WHEN database connections fail THEN the system SHALL retry with exponential backoff up to 3 times
4. WHEN profile API returns partial data THEN the system SHALL use available data and log warnings
5. IF critical errors occur THEN the system SHALL return appropriate HTTP status codes and error messages
