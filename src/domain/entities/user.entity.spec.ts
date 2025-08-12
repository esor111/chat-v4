import { User } from './user.entity';

describe('User Entity', () => {
  it('should create a user entity', () => {
    const user = new User();
    user.userId = 123;

    expect(user.userId).toBe(123);
    expect(user).toBeInstanceOf(User);
  });

  it('should have userId property', () => {
    const user = new User();
    user.userId = 456;
    
    expect(user.userId).toBe(456);
  });
});