import { User } from './user.entity';

describe('User Entity', () => {
  it('should create a user entity', () => {
    const user = new User();
    user.id = '123';

    expect(user.id).toBe('123');
    expect(user).toBeInstanceOf(User);
  });

  it('should have id property', () => {
    const user = new User();
    user.id = '456';
    
    expect(user.id).toBe('456');
  });
});