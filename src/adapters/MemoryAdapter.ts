import { StorageAdapter, User, Role, UserRole, QueryOptions } from '../types';
import { IdGenerator } from '../utils/idGenerator';
import { Validator } from '../utils/validation';

export class MemoryAdapter implements StorageAdapter {
  private users: Map<string, User> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, UserRole> = new Map();
  private inTransaction = false;
  private transactionData: {
    users: Map<string, User>;
    roles: Map<string, Role>;
    userRoles: Map<string, UserRole>;
  } | null = null;

  async initialize(): Promise<void> {
    // No initialization needed for memory adapter
  }

  async shutdown(): Promise<void> {
    // No shutdown needed for memory adapter
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }

    this.inTransaction = true;
    this.transactionData = {
      users: new Map(this.users),
      roles: new Map(this.roles),
      userRoles: new Map(this.userRoles),
    };
  }

  async commit(): Promise<void> {
    if (!this.inTransaction || !this.transactionData) {
      throw new Error('No transaction in progress');
    }

    // Copy transaction data back to main data
    this.users = this.transactionData.users;
    this.roles = this.transactionData.roles;
    this.userRoles = this.transactionData.userRoles;

    this.inTransaction = false;
    this.transactionData = null;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction || !this.transactionData) {
      throw new Error('No transaction in progress');
    }

    // Simply discard the transaction data, main data remains unchanged
    this.inTransaction = false;
    this.transactionData = null;
  }

  private getUserMap(): Map<string, User> {
    return this.inTransaction && this.transactionData ? this.transactionData.users : this.users;
  }

  private getRoleMap(): Map<string, Role> {
    return this.inTransaction && this.transactionData ? this.transactionData.roles : this.roles;
  }

  private getUserRoleMap(): Map<string, UserRole> {
    return this.inTransaction && this.transactionData ? this.transactionData.userRoles : this.userRoles;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const validationErrors = Validator.validateUser(userData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    const id = IdGenerator.generate();
    const now = new Date();
    const user: User = {
      ...userData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.getUserMap().set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    return this.getUserMap().get(id) || null;
  }

  async getUsers(options?: QueryOptions): Promise<{ items: User[]; total: number }> {
    const validationError = Validator.validateQueryOptions(options);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    let users = Array.from(this.getUserMap().values());
    const total = users.length;

    // Apply filter
    if (options?.filter) {
      users = users.filter(user => {
        return Object.entries(options.filter!).every(([key, value]) => {
          return user[key as keyof User] === value;
        });
      });
    }

    // Apply sort
    if (options?.sort) {
      users.sort((a, b) => {
        for (const [key, order] of Object.entries(options.sort!)) {
          const aValue = a[key as keyof User];
          const bValue = b[key as keyof User];
          if (aValue !== undefined && bValue !== undefined) {
            if (aValue < bValue) return order === 'asc' ? -1 : 1;
            if (aValue > bValue) return order === 'asc' ? 1 : -1;
          }
        }
        return 0;
      });
    }

    // Apply pagination
    if (options?.limit) {
      const offset = options.offset || 0;
      users = users.slice(offset, offset + options.limit);
    }

    return { items: users, total };
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const users = this.getUserMap();
    const user = users.get(id);
    if (!user) {
      return null;
    }

    const validationErrors = Validator.validateUser({ ...user, ...userData });
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };

    users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const users = this.getUserMap();
    const userRoles = this.getUserRoleMap();

    // Remove user roles first
    for (const [key, userRole] of userRoles.entries()) {
      if (userRole.userId === id) {
        userRoles.delete(key);
      }
    }

    return users.delete(id);
  }

  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const validationErrors = Validator.validateRole(roleData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    const id = IdGenerator.generate();
    const now = new Date();
    const role: Role = {
      ...roleData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.getRoleMap().set(id, role);
    return role;
  }

  async getRoleById(id: string): Promise<Role | null> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    return this.getRoleMap().get(id) || null;
  }

  async getRoles(options?: QueryOptions): Promise<{ items: Role[]; total: number }> {
    const validationError = Validator.validateQueryOptions(options);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    let roles = Array.from(this.getRoleMap().values());
    const total = roles.length;

    // Apply filter
    if (options?.filter) {
      roles = roles.filter(role => {
        return Object.entries(options.filter!).every(([key, value]) => {
          return role[key as keyof Role] === value;
        });
      });
    }

    // Apply sort
    if (options?.sort) {
      roles.sort((a, b) => {
        for (const [key, order] of Object.entries(options.sort!)) {
          const aValue = a[key as keyof Role];
          const bValue = b[key as keyof Role];
          if (aValue !== undefined && bValue !== undefined) {
            if (aValue < bValue) return order === 'asc' ? -1 : 1;
            if (aValue > bValue) return order === 'asc' ? 1 : -1;
          }
        }
        return 0;
      });
    }

    // Apply pagination
    if (options?.limit) {
      const offset = options.offset || 0;
      roles = roles.slice(offset, offset + options.limit);
    }

    return { items: roles, total };
  }

  async updateRole(id: string, roleData: Partial<Role>): Promise<Role | null> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const roles = this.getRoleMap();
    const role = roles.get(id);
    if (!role) {
      return null;
    }

    const validationErrors = Validator.validateRole({ ...role, ...roleData });
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    const updatedRole: Role = {
      ...role,
      ...roleData,
      updatedAt: new Date(),
    };

    roles.set(id, updatedRole);
    return updatedRole;
  }

  async deleteRole(id: string): Promise<boolean> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const roles = this.getRoleMap();
    const userRoles = this.getUserRoleMap();

    // Remove user roles first
    for (const [key, userRole] of userRoles.entries()) {
      if (userRole.roleId === id) {
        userRoles.delete(key);
      }
    }

    return roles.delete(id);
  }

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    const userIdError = Validator.validateId(userId);
    const roleIdError = Validator.validateId(roleId);
    if (userIdError || roleIdError) {
      throw new Error(
        `Validation failed: ${[userIdError, roleIdError].filter(Boolean).map(e => e!.message).join(', ')}`
      );
    }

    // Check in both main data and transaction data
    const userExists = this.users.has(userId) || (this.transactionData?.users.has(userId) ?? false);
    const roleExists = this.roles.has(roleId) || (this.transactionData?.roles.has(roleId) ?? false);
    
    if (!userExists || !roleExists) {
      throw new Error('User or role not found');
    }

    const key = `${userId}:${roleId}`;
    const userRoles = this.getUserRoleMap();

    if (userRoles.has(key)) {
      return userRoles.get(key)!;
    }

    const now = new Date();
    const userRole: UserRole = {
      userId,
      roleId,
      createdAt: now,
    };

    userRoles.set(key, userRole);
    return userRole;
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    const userIdError = Validator.validateId(userId);
    const roleIdError = Validator.validateId(roleId);
    if (userIdError || roleIdError) {
      throw new Error(
        `Validation failed: ${[userIdError, roleIdError].filter(Boolean).map(e => e!.message).join(', ')}`
      );
    }

    const key = `${userId}:${roleId}`;
    const userRoles = this.getUserRoleMap();
    return userRoles.delete(key);
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const validationError = Validator.validateId(userId);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const userRoles = this.getUserRoleMap();
    const roles = this.getRoleMap();
    const roleIds = new Set<string>();

    for (const userRole of userRoles.values()) {
      if (userRole.userId === userId) {
        roleIds.add(userRole.roleId);
      }
    }

    return Array.from(roleIds)
      .map(roleId => roles.get(roleId))
      .filter((role): role is Role => role !== undefined);
  }

  async getRoleUsers(roleId: string): Promise<User[]> {
    const validationError = Validator.validateId(roleId);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const userRoles = this.getUserRoleMap();
    const users = this.getUserMap();
    const userIds = new Set<string>();

    for (const userRole of userRoles.values()) {
      if (userRole.roleId === roleId) {
        userIds.add(userRole.userId);
      }
    }

    return Array.from(userIds)
      .map(userId => users.get(userId))
      .filter((user): user is User => user !== undefined);
  }
}
