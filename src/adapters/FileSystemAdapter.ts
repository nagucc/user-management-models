import { StorageAdapter, User, Role, UserRole, QueryOptions } from '../types';
import { IdGenerator } from '../utils/idGenerator';
import { Validator } from '../utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';

interface FileSystemData {
  users: User[];
  roles: Role[];
  userRoles: UserRole[];
}

export class FileSystemAdapter implements StorageAdapter {
  private dataDir: string;
  private dataPath: string;
  private data: FileSystemData;
  private inTransaction = false;
  private transactionData: FileSystemData | null = null;

  constructor(options?: { dataDir?: string }) {
    this.dataDir = options?.dataDir || path.join(process.cwd(), '.user-management-data');
    this.dataPath = path.join(this.dataDir, 'data.json');
    this.data = {
      users: [],
      roles: [],
      userRoles: [],
    };
  }

  async initialize(options?: { dataDir?: string }): Promise<void> {
    if (options?.dataDir) {
      this.dataDir = options.dataDir;
      this.dataPath = path.join(this.dataDir, 'data.json');
    }

    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      const dataStr = await fs.readFile(this.dataPath, 'utf-8');
      this.data = JSON.parse(dataStr);
      
      // Convert string dates back to Date objects
      this.data.users.forEach(user => {
        user.createdAt = new Date(user.createdAt);
        user.updatedAt = new Date(user.updatedAt);
      });
      
      this.data.roles.forEach(role => {
        role.createdAt = new Date(role.createdAt);
        role.updatedAt = new Date(role.updatedAt);
      });
      
      this.data.userRoles.forEach(userRole => {
        userRole.createdAt = new Date(userRole.createdAt);
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, initialize with empty data
        await this.saveData();
      } else {
        throw error;
      }
    }
  }

  async shutdown(): Promise<void> {
    // Ensure all data is saved before shutdown
    await this.saveData();
  }

  private async saveData(): Promise<void> {
    const dataStr = JSON.stringify(this.data, null, 2);
    await fs.writeFile(this.dataPath, dataStr, 'utf-8');
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }

    this.inTransaction = true;
    this.transactionData = JSON.parse(JSON.stringify(this.data));
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.saveData();
    this.inTransaction = false;
    this.transactionData = null;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction || !this.transactionData) {
      throw new Error('No transaction in progress');
    }

    this.data = this.transactionData;
    this.inTransaction = false;
    this.transactionData = null;
  }

  private _getUsers(): User[] {
    return this.data.users;
  }

  private _getRoles(): Role[] {
    return this.data.roles;
  }

  private _getUserRoles(): UserRole[] {
    return this.data.userRoles;
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

    this.data.users.push(user);
    if (!this.inTransaction) {
      await this.saveData();
    }
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    return this._getUsers().find(user => user.id === id) || null;
  }

  async getUsers(options?: QueryOptions): Promise<{ items: User[]; total: number }> {
    const validationError = Validator.validateQueryOptions(options);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    let users = [...this._getUsers()];
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

    const userIndex = this.data.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    const updatedUser = {
      ...this.data.users[userIndex],
      ...userData,
      updatedAt: new Date(),
    };

    const validationErrors = Validator.validateUser(updatedUser);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.data.users[userIndex] = updatedUser;
    if (!this.inTransaction) {
      await this.saveData();
    }
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const userIndex = this.data.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return false;
    }

    // Remove user roles first
    this.data.userRoles = this.data.userRoles.filter(userRole => userRole.userId !== id);
    
    this.data.users.splice(userIndex, 1);
    if (!this.inTransaction) {
      await this.saveData();
    }
    return true;
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

    this.data.roles.push(role);
    if (!this.inTransaction) {
      await this.saveData();
    }
    return role;
  }

  async getRoleById(id: string): Promise<Role | null> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    return this._getRoles().find(role => role.id === id) || null;
  }

  async getRoles(options?: QueryOptions): Promise<{ items: Role[]; total: number }> {
    const validationError = Validator.validateQueryOptions(options);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    let roles = [...this._getRoles()];
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

    const roleIndex = this.data.roles.findIndex(role => role.id === id);
    if (roleIndex === -1) {
      return null;
    }

    const updatedRole = {
      ...this.data.roles[roleIndex],
      ...roleData,
      updatedAt: new Date(),
    };

    const validationErrors = Validator.validateRole(updatedRole);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.data.roles[roleIndex] = updatedRole;
    if (!this.inTransaction) {
      await this.saveData();
    }
    return updatedRole;
  }

  async deleteRole(id: string): Promise<boolean> {
    const validationError = Validator.validateId(id);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const roleIndex = this.data.roles.findIndex(role => role.id === id);
    if (roleIndex === -1) {
      return false;
    }

    // Remove user roles first
    this.data.userRoles = this.data.userRoles.filter(userRole => userRole.roleId !== id);
    
    this.data.roles.splice(roleIndex, 1);
    if (!this.inTransaction) {
      await this.saveData();
    }
    return true;
  }

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    const userIdError = Validator.validateId(userId);
    const roleIdError = Validator.validateId(roleId);
    if (userIdError || roleIdError) {
      throw new Error(
        `Validation failed: ${[userIdError, roleIdError].filter(Boolean).map(e => e!.message).join(', ')}`
      );
    }

    const userExists = this._getUsers().some(user => user.id === userId);
    const roleExists = this._getRoles().some(role => role.id === roleId);
    if (!userExists || !roleExists) {
      throw new Error('User or role not found');
    }

    const existingUserRole = this._getUserRoles().find(
      userRole => userRole.userId === userId && userRole.roleId === roleId
    );

    if (existingUserRole) {
      return existingUserRole;
    }

    const now = new Date();
    const userRole: UserRole = {
      userId,
      roleId,
      createdAt: now,
    };

    this.data.userRoles.push(userRole);
    if (!this.inTransaction) {
      await this.saveData();
    }
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

    const initialLength = this.data.userRoles.length;
    this.data.userRoles = this.data.userRoles.filter(
      userRole => !(userRole.userId === userId && userRole.roleId === roleId)
    );
    
    const removed = this.data.userRoles.length < initialLength;
    if (removed && !this.inTransaction) {
      await this.saveData();
    }
    return removed;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const validationError = Validator.validateId(userId);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const roleIds = new Set(
      this._getUserRoles()
        .filter(userRole => userRole.userId === userId)
        .map(userRole => userRole.roleId)
    );

    return this._getRoles().filter(role => roleIds.has(role.id));
  }

  async getRoleUsers(roleId: string): Promise<User[]> {
    const validationError = Validator.validateId(roleId);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const userIds = new Set(
      this._getUserRoles()
        .filter(userRole => userRole.roleId === roleId)
        .map(userRole => userRole.userId)
    );

    return this._getUsers().filter(user => userIds.has(user.id));
  }
}
