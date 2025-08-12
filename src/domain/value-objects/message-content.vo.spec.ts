import { MessageContent } from './message-content.vo';

describe('MessageContent Value Object', () => {
  describe('create', () => {
    it('should create message content with valid text', () => {
      const content = 'Hello, world!';
      const messageContent = MessageContent.create(content);

      expect(messageContent.content).toBe(content);
      expect(messageContent.length()).toBe(content.length);
    });

    it('should throw error for empty content', () => {
      expect(() => MessageContent.create('')).toThrow('Message content must be a non-empty string');
      expect(() => MessageContent.create('   ')).toThrow('Message content must be at least 1 character long');
    });

    it('should throw error for null or undefined content', () => {
      expect(() => MessageContent.create(null as any)).toThrow('Message content must be a non-empty string');
      expect(() => MessageContent.create(undefined as any)).toThrow('Message content must be a non-empty string');
    });

    it('should throw error for content exceeding max length', () => {
      const longContent = 'a'.repeat(10001);
      expect(() => MessageContent.create(longContent)).toThrow('Message content cannot exceed 10000 characters');
    });
  });

  describe('contains', () => {
    it('should return true if content contains substring (case insensitive)', () => {
      const messageContent = MessageContent.create('Hello, World!');

      expect(messageContent.contains('hello')).toBe(true);
      expect(messageContent.contains('WORLD')).toBe(true);
      expect(messageContent.contains('world!')).toBe(true);
    });

    it('should return false if content does not contain substring', () => {
      const messageContent = MessageContent.create('Hello, World!');

      expect(messageContent.contains('goodbye')).toBe(false);
      expect(messageContent.contains('xyz')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for identical content', () => {
      const content1 = MessageContent.create('Hello');
      const content2 = MessageContent.create('Hello');

      expect(content1.equals(content2)).toBe(true);
    });

    it('should return false for different content', () => {
      const content1 = MessageContent.create('Hello');
      const content2 = MessageContent.create('World');

      expect(content1.equals(content2)).toBe(false);
    });
  });
});