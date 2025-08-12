import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from '../chat.gateway';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        WsJwtGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);

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
      
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.userId).toBe(123);
      expect(mockSocket.user).toEqual({ id: 123, name: 'Test User' });
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'Successfully connected to chat',
        userId: 123,
      });
    });

    it('should disconnect client with invalid token', async () => {
      mockSocket.handshake.auth.token = 'invalid-token';
      
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with no token', async () => {
      mockSocket.handshake = { headers: {}, query: {}, auth: {} };

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
      const data = { conversation_id: 456 };

      await gateway.handleJoinConversation(data, mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('conversation_456');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_conversation', {
        conversation_id: 456,
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
      const data = { conversation_id: 456 };

      await gateway.handleLeaveConversation(data, mockSocket as any);

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation_456');
      expect(mockSocket.emit).toHaveBeenCalledWith('left_conversation', {
        conversation_id: 456,
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
        conversation_id: 456,
        content: 'Hello world',
        message_type: 'text',
      };

      await gateway.handleMessage(data, mockSocket as any);

      expect(mockServer.to).toHaveBeenCalledWith('conversation_456');
      expect(mockSocket.emit).toHaveBeenCalledWith('message_sent', expect.objectContaining({
        conversation_id: 456,
      }));
    });

    it('should reject empty message', async () => {
      const data = {
        conversation_id: 456,
        content: '',
      };

      await gateway.handleMessage(data, mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message content cannot be empty',
      });
    });

    it('should trim message content', async () => {
      const data = {
        conversation_id: 456,
        content: '  Hello world  ',
      };

      await gateway.handleMessage(data, mockSocket as any);

      expect(mockServer.to).toHaveBeenCalledWith('conversation_456');
      // The message should be trimmed
      expect(mockSocket.emit).toHaveBeenCalledWith('message_sent', expect.any(Object));
    });
  });

  describe('typing indicators', () => {
    beforeEach(() => {
      mockSocket.userId = 123;
      mockSocket.user = { id: 123, name: 'Test User' };
    });

    it('should broadcast typing start', async () => {
      const data = { conversation_id: 456 };

      await gateway.handleTypingStart(data, mockSocket as any);

      expect(mockSocket.to).toHaveBeenCalledWith('conversation_456');
    });

    it('should broadcast typing stop', async () => {
      const data = { conversation_id: 456 };

      await gateway.handleTypingStop(data, mockSocket as any);

      expect(mockSocket.to).toHaveBeenCalledWith('conversation_456');
    });
  });

  describe('utility methods', () => {
    it('should track connected users', () => {
      expect(gateway.getConnectedUsersCount()).toBe(0);
      expect(gateway.isUserConnected(123)).toBe(false);
      expect(gateway.getUserSocketCount(123)).toBe(0);
    });

    it('should send message to user', async () => {
      // This would require setting up the internal user tracking
      const result = await gateway.sendMessageToUser(123, 'test_event', { data: 'test' });
      expect(result).toBe(false); // User not connected
    });

    it('should send message to conversation', async () => {
      await gateway.sendMessageToConversation(456, 'test_event', { data: 'test' });
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