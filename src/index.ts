// Export main classes and functions
export { UserManagement, createUserManagement } from './UserManagement';

// Export models
export { UserManager } from './models/UserManager';
export { RoleManager } from './models/RoleManager';

// Export adapters
export { MemoryAdapter } from './adapters/MemoryAdapter';
export { FileSystemAdapter } from './adapters/FileSystemAdapter';

// Export managers
export { PluginManager } from './plugins/PluginManager';
export { HookManager } from './hooks/HookManager';

// Export types
export * from './types';

// Export utilities
export { Validator } from './utils/validation';
export { IdGenerator } from './utils/idGenerator';
