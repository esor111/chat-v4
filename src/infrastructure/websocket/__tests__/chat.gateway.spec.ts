import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from '../chat.gateway';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { WebSocketConnectionService } from '../services/websocket-connection.service';
import { WebSocketBroadcastService } from '../services/websocket-broadcast.service';
import { ConversationAccessService } from '../services/conversation-access.service';
import { WebSocketErrorService } from '../services/websocket-error.service';
import { InputSanitizationService } from '../services/input-sanitization.service';
import { RateLimitingService } from '../services/rate-limiting.service';
import { WebSocketMessageHandlerService } from '../services/websocket-message-handler.service';

// Mock Socket.IO
const mockSocket = {
  id: 'test-socket-id',
  userId: undefined,
  user: undefined,
  handshake: {
    headers: {} as any,
    query: {} as any,
    auth: {} as any,
  },
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn(() => ({
    emit: jest.fn(),
  })),
  disconnect: jest.fn(),
};

const mockServer = {
  to: jest.fn(() => ({
    emit: jest.fn(),
  })),
};

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: JwtService;
  let connectionService: WebSocketConnectionService;
  let broadcastService: WebSocketBroadcastService;
  let accessService: ConversationAccessService;
  let errorService: WebSocketErrorService;
  let sanitizationService: InputSanitizationService;
  let rateLimitingService: RateLimitingService;
  let messageHandlerService: WebSocketMessageHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        WsJwtGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: WebSocketConnectionService,
          useValue: {
            authenticateSocket: jest.fn(),
            disconnectUser: jest.fn(),
            getConnectedUsersCount: jest.fn().mockReturnValue(0),
            isUserConnected: jest.fn().mockReturnValue(false),
            getUserSocketCount: jest.fn().mockReturnValue(0),
          },
        },
        {
          provide: WebSocketBroadcastService,
          useValue: {
            setServer: jest.fn(),
            sendMessageToUser: jest.fn(),
            sendMessageToConversation: jest.fn(),
          },
        },
        {
          provide: ConversationAccessService,
          useValue: {
            validateAccess: jest.fn(),
            canSendMessage: jest.fn(),
          },
        },
        {
          provide: WebSocketErrorService,
          useValue: {
            handleError: jest.fn(),
          },
        },
        {
          provide: InputSanitizationService,
          useValue: {
            sanitizeMessageContent: jest.fn(),
            isValidConversationId: jest.fn(),
          },
        },
        {
          provide: RateLimitingService,
          useValue: {
            isWithinLimit: jest.fn().mockReturnValue(true),
            cleanup: jest.fn(),
          },
        },
        {
          provide: WebSocketMessageHandlerService,
          useValue: {
            validateMessageRequest: jest.fn(),
            createFallbackMessage: jest.fn(),
            sendMessageError: jest.fn(),
            sendMessageConfirmation: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);
    connectionService = module.get<WebSocketConnectionService>(WebSocketConnectionService);
    broadcastService = module.get<WebSocketBroadcastService>(WebSocketBroadcastService);
    accessService = module.get<ConversationAccessService>(ConversationAccessService);
    errorService = module.get<WebSocketErrorService>(WebSocketErrorService);
    sanitizationService = module.get<InputSanitizationService>(InputSanitizationService);
    rateLimitingService = module.get<RateLimitingService>(RateLimitingService);
    messageHandlerService = module.get<WebSocketMessageHandlerService>(WebSocketMessageHandlerService);

    // Set up the mock server
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate user with valid token', async () => {
      const mockPayload = { sub: 123, name: 'Test User' };
      mockSocket.handshake.auth.token = 'valid-token';
      
      jest.spyOn(connectionService, 'authenticateSocket').mockResolvedValue(true);
      mockSocket.userId = '123';
      mockSocket.user = { id: '123', name: 'Test User' };

      await gateway.handleConnection(mockSocket as any);

      expect(connectionService.authenticateSocket).toHaveBeenCalledWith(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'Successfully connected to chat',
        userId: '123',
      });
    });

    it('should disconnect client with invalid authentication', async () => {
      jest.spyOn(connectionService, 'authenticateSocket').mockResolvedValue(false);

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle authentication errors gracefully', async () => {
      jest.spyOn(connectionService, 'authenticateSocket').mockRejectedValue(new Error('Auth error'));

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinConversation', () => {
    beforeEach(() => {
      mockSocket.userId = 123;
      mockSocket.user = { id: 123, name: 'Test User' };
    });

    it('should join conversation room', async () => {
      const data = { conversation_id: '456' };

      await gateway.handleJoinConversation(data, mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('conversation_456');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_conversation', {
        conversation_id: '456',
        message: 'Joined conversation 456',
      });
    });
  });

  describe('handleLeaveConversation', () => {
    beforeEach(() => {
      mockSocket.userId = 123;
      mockSocket.user = { id: 123, name: 'Test User' };
    });

    it('should leave conversation room', async () => {
      const data = { conversation_id: '456' };

      await gateway.handleLeaveConversation(data, mockSocket as any);

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation_456');
      expect(mockSocket.emit).toHaveBeenCalledWith('left_conversation', {
        conversation_id: '456',
        message: 'Left conversation 456',
      });
    });
  });

  describe('handleMessage', () => {
    beforeEach(() => {
      mockSocket.userId = 123;
      mockSocket.user = { id: 123, name: 'Test User' };
    });

    it('should broadcast message to conversation', async () => {
      const data = {
        conversation_id: '456',
        content: 'Hello world',
        message_type: 'text',
      };

      jest.spyOn(messageHandlerService, 'validateMessageRequest').mockResolvedValue({
        isValid: true,
        sanitizedContent: 'Hello world',
      });

      jest.spyOn(messageHandlerService, 'createFallbackMessage').mockReturnValue({
        message_id: 'test-id',
        conversation_id: '456',
        sender_id: '123',
        sender_name: 'Test User',
        content: 'Hello world',
        message_type: 'text',
        sent_at: '2023-01-01T00:00:00.000Z',
      });

      await gateway.handleMessage(data, mockSocket as any);

      expect(mockServer.to).toHaveBeenCalledWith('conversation_456');
      expect(messageHandlerService.sendMessageConfirmation).toHaveBeenCalled();
    });

    it('should reject invalid message', async () => {
      const data = {
        conversation_id: '456',
        content: '',
      };

      jest.spyOn(messageHandlerService, 'validateMessageRequest').mockResolvedValue({
        isValid: false,
        error: 'Message content cannot be empty',
      });

      await gateway.handleMessage(data, mockSocket as any);

      expect(messageHandlerService.sendMessageError).toHaveBeenCalledWith(
        mockSocket,
        'Message content cannot be empty',
        '456'
      );
    });

    it('should handle validation errors', async () => {
      const data = {
        conversation_id: '456',
        content: 'Hello world',
      };

      jest.spyOn(messageHandlerService, 'validateMessageRequest').mockRejectedValue(
        new Error('Validation failed')
      );

      await gateway.handleMessage(data, mockSocket as any);

      expect(errorService.handleError).toHaveBeenCalledWith(
        mockSocket,
        expect.any(Error),
        'send_message'
      );
    });
  });

  describe('typing indicators', () => {
    beforeEach(() => {
      mockSocket.userId = 123;
      mockSocket.user = { id: 123, name: 'Test User' };
    });

    it('should broadcast typing start', async () => {
      const data = { conversation_id: '456' };

      await gateway.handleTypingStart(data, mockSocket as any);

      expect(mockSocket.to).toHaveBeenCalledWith('conversation_456');
    });

    it('should broadcast typing stop', async () => {
      const data = { conversation_id: '456' };

      await gateway.handleTypingStop(data, mockSocket as any);

      expect(mockSocket.to).toHaveBeenCalledWith('conversation_456');
    });
  });

  describe('utility methods', () => {
    it('should track connected users', () => {
      expect(gateway.getConnectedUsersCount()).toBe(0);
      expect(gateway.isUserConnected('123')).toBe(false);
      expect(gateway.getUserSocketCount('123')).toBe(0);
    });

    it('should send message to user', async () => {
      // This would require setting up the internal user tracking
      const result = await gateway.sendMessageToUser('123', 'error', { message: 'test' });
      expect(result).toBe(false); // User not connected
    });

    it('should send message to conversation', async () => {
      await gateway.sendMessageToConversation('456', 'error', { message: 'test' });
      expect(mockServer.to).toHaveBeenCalledWith('conversation_456');
    });
  });

  describe('handleDisconnect', () => {
    it('should handle authenticated user disconnect', () => {
      mockSocket.userId = 123;
      
      // This should not throw an error
      expect(() => gateway.handleDisconnect(mockSocket as any)).not.toThrow();
    });

    it('should handle unauthenticated user disconnect', () => {
      mockSocket.userId = undefined;
      
      // This should not throw an error
      expect(() => gateway.handleDisconnect(mockSocket as any)).not.toThrow();
    });
  });
});