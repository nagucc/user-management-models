import { createUserManagement } from '../index';

describe('User Management Library', () => {
  let userMgmt: any; // Using any for testing purposes

  beforeEach(async () => {
    userMgmt = createUserManagement();
    await userMgmt.initialize();
  });

  afterEach(async () => {
    await userMgmt.shutdown();
  });

  describe('Role Management', () => {
    test('should create a role', async () => {
      const role = await userMgmt.roles.createRole({
        name: 'Admin',
        description: 'Administrator role',
        tags: { level: '1' }
      });

      expect(role).toHaveProperty('id');
      expect(role.name).toBe('Admin');
      expect(role.description).toBe('Administrator role');
      expect(role.tags).toEqual({ level: '1' });
    });

    test('should get roles with pagination', async () => {
      // Create multiple roles
      for (let i = 0; i < 5; i++) {
        await userMgmt.roles.createRole({
          name: `Role ${i}`,
          description: `Description ${i}`
        });
      }

      const result = await userMgmt.roles.getRoles({ limit: 2, offset: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.items[0].name).toBe('Role 1');
    });
  });

  describe('User Management', () => {
    test('should create a user', async () => {
      const user = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        tags: { active: true }
      });

      expect(user).toHaveProperty('id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.tags).toEqual({ active: true });
    });

    test('should get user by id', async () => {
      const createdUser = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const user = await userMgmt.users.getUserById(createdUser.id);
      expect(user).not.toBeNull();
      expect(user!.id).toBe(createdUser.id);
      expect(user!.username).toBe('testuser');
    });

    test('should update a user', async () => {
      const createdUser = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const updatedUser = await userMgmt.users.updateUser(createdUser.id, {
        username: 'updateduser',
        tags: { updated: true }
      });

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.username).toBe('updateduser');
      expect(updatedUser!.tags).toEqual({ updated: true });
    });

    test('should delete a user', async () => {
      const createdUser = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const result = await userMgmt.users.deleteUser(createdUser.id);
      expect(result).toBe(true);

      const deletedUser = await userMgmt.users.getUserById(createdUser.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('User-Role Association', () => {
    test('should assign a role to a user', async () => {
      // Create user and role
      const user = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const role = await userMgmt.roles.createRole({
        name: 'Admin',
        description: 'Administrator role'
      });

      // Assign role to user
      const userRole = await userMgmt.assignRole(user.id, role.id);
      expect(userRole.userId).toBe(user.id);
      expect(userRole.roleId).toBe(role.id);

      // Get user roles
      const userRoles = await userMgmt.users.getUserRoles(user.id);
      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].id).toBe(role.id);

      // Get role users
      const roleUsers = await userMgmt.roles.getRoleUsers(role.id);
      expect(roleUsers).toHaveLength(1);
      expect(roleUsers[0].id).toBe(user.id);
    });

    test('should remove a role from a user', async () => {
      // Create user and role
      const user = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const role = await userMgmt.roles.createRole({
        name: 'Admin',
        description: 'Administrator role'
      });

      // Assign role to user
      await userMgmt.assignRole(user.id, role.id);

      // Remove role from user
      const result = await userMgmt.removeRole(user.id, role.id);
      expect(result).toBe(true);

      // Get user roles - should be empty
      const userRoles = await userMgmt.users.getUserRoles(user.id);
      expect(userRoles).toHaveLength(0);
    });
  });

  describe('Transaction Management', () => {
    test('should rollback transaction on error', async () => {
      // Create user and role
      const user = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const role = await userMgmt.roles.createRole({
        name: 'Admin',
        description: 'Administrator role'
      });

      try {
        // Start transaction
        await userMgmt.beginTransaction();
        
        // Assign role to user
        await userMgmt.assignRole(user.id, role.id);
        
        // Get user roles - should have the role
        const userRoles1 = await userMgmt.users.getUserRoles(user.id);
        expect(userRoles1).toHaveLength(1);
        
        // Throw error to trigger rollback
        throw new Error('Test rollback');
      } catch {
        // Rollback transaction
        await userMgmt.rollback();
        
        // Get user roles - should be empty after rollback
        const userRoles2 = await userMgmt.users.getUserRoles(user.id);
        expect(userRoles2).toHaveLength(0);
      }
    });

    test('should commit transaction', async () => {
      // Create user and role
      const user = await userMgmt.users.createUser({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      });

      const role = await userMgmt.roles.createRole({
        name: 'Admin',
        description: 'Administrator role'
      });

      // Start transaction
      await userMgmt.beginTransaction();
      
      // Assign role to user
      await userMgmt.assignRole(user.id, role.id);
      
      // Commit transaction
      await userMgmt.commit();
      
      // Get user roles - should have the role after commit
      const userRoles = await userMgmt.users.getUserRoles(user.id);
      expect(userRoles).toHaveLength(1);
    });
  });
});
