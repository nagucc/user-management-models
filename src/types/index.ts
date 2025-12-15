export interface Tag {
  [key: string]: string | number | boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  tags?: Tag;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  tags?: Tag;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  createdAt: Date;
}

export interface QueryFilter {
  [key: string]: any;
}

export interface QueryOptions {
  filter?: QueryFilter;
  sort?: { [key: string]: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface StorageAdapter {
  // User operations
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUsers(options?: QueryOptions): Promise<{ items: User[]; total: number }>;
  updateUser(id: string, user: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;

  // Role operations
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
  getRoleById(id: string): Promise<Role | null>;
  getRoles(options?: QueryOptions): Promise<{ items: Role[]; total: number }>;
  updateRole(id: string, role: Partial<Role>): Promise<Role | null>;
  deleteRole(id: string): Promise<boolean>;

  // User-Role operations
  assignRole(userId: string, roleId: string): Promise<UserRole>;
  removeRole(userId: string, roleId: string): Promise<boolean>;
  getUserRoles(userId: string): Promise<Role[]>;
  getRoleUsers(roleId: string): Promise<User[]>;

  // Transaction operations
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;

  // Lifecycle methods
  initialize(options?: any): Promise<void>;
  shutdown(): Promise<void>;
}

export interface Plugin {
  name: string;
  version: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface Hook {
  name: string;
  callback: (data: HookEvent) => Promise<HookEvent | undefined>;
  priority?: number;
}

export interface HookEvent {
  [key: string]: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Config {
  adapter?: string;
  [key: string]: any;
}
