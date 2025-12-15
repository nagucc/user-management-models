import { StorageAdapter, UserRole, Config, Plugin, HookEvent } from './types';
import { PluginManager } from './plugins/PluginManager';
import { HookManager } from './hooks/HookManager';
import { UserManager } from './models/UserManager';
import { RoleManager } from './models/RoleManager';

export class UserManagement {
  private pluginManager: PluginManager;
  private hookManager: HookManager;
  private adapter: StorageAdapter | null = null;
  private userManager: UserManager | null = null;
  private roleManager: RoleManager | null = null;
  private initialized = false;

  constructor(private config: Config = {}) {
    this.pluginManager = new PluginManager();
    this.hookManager = new HookManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load adapter
    await this.loadAdapter();
    
    // Load plugins
    await this.pluginManager.loadAllPlugins();
    
    // Initialize adapter
    await this.adapter!.initialize(this.config);
    
    // Create managers
    this.userManager = new UserManager(this.adapter!, this.hookManager);
    this.roleManager = new RoleManager(this.adapter!, this.hookManager);
    
    this.initialized = true;
  }

  private async loadAdapter(): Promise<void> {
    const adapterName = this.config.adapter || 'memory';
    const AdapterClass = this.pluginManager.getAdapter(adapterName);
    this.adapter = new AdapterClass(this.config);
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Shutdown adapter
    await this.adapter!.shutdown();
    
    // Unload plugins
    await this.pluginManager.unloadAllPlugins();
    
    this.initialized = false;
    this.adapter = null;
    this.userManager = null;
    this.roleManager = null;
  }

  // User Management API
  get users(): UserManager {
    this.ensureInitialized();
    return this.userManager!;
  }

  // Role Management API
  get roles(): RoleManager {
    this.ensureInitialized();
    return this.roleManager!;
  }

  // User-Role Association API
  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    this.ensureInitialized();
    
    // Execute pre-assign hooks
    const preData = await this.hookManager.executeHooks('userRole.preAssign', { userId, roleId });
    
    const userRole = await this.adapter!.assignRole(preData.userId, preData.roleId);
    
    // Execute post-assign hooks
    await this.hookManager.executeHooks('userRole.postAssign', { userRole });
    
    return userRole;
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    this.ensureInitialized();
    
    // Execute pre-remove hooks
    const preData = await this.hookManager.executeHooks('userRole.preRemove', { userId, roleId });
    
    const result = await this.adapter!.removeRole(preData.userId, preData.roleId);
    
    // Execute post-remove hooks
    await this.hookManager.executeHooks('userRole.postRemove', { userId: preData.userId, roleId: preData.roleId, result });
    
    return result;
  }

  // Transaction API
  async beginTransaction(): Promise<void> {
    this.ensureInitialized();
    await this.adapter!.beginTransaction();
  }

  async commit(): Promise<void> {
    this.ensureInitialized();
    await this.adapter!.commit();
  }

  async rollback(): Promise<void> {
    this.ensureInitialized();
    await this.adapter!.rollback();
  }

  // Plugin Management API
  registerPlugin(plugin: Plugin): void {
    this.pluginManager.registerPlugin(plugin);
  }

  registerAdapter(name: string, adapter: new (options?: Record<string, unknown>) => StorageAdapter): void {
    this.pluginManager.registerAdapter(name, adapter);
  }

  // Hook Management API
  registerHook(event: string, callback: (data: HookEvent) => Promise<HookEvent | undefined>, priority = 0): void {
    this.hookManager.registerHook(event, callback, priority);
  }

  removeHook(event: string, callback: (data: HookEvent) => Promise<HookEvent | undefined>): void {
    this.hookManager.removeHook(event, callback);
  }

  removeAllHooks(event?: string): void {
    this.hookManager.removeAllHooks(event);
  }

  // Configuration API
  updateConfig(config: Partial<Config>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): Config {
    return { ...this.config };
  }

  // Utility methods
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('UserManagement not initialized. Call initialize() first.');
    }
  }

  // Get registered plugins
  getRegisteredPlugins(): string[] {
    return this.pluginManager.getRegisteredPlugins();
  }

  // Get registered adapters
  getRegisteredAdapters(): string[] {
    return this.pluginManager.getRegisteredAdapters();
  }
}

// Export factory function
export function createUserManagement(config?: Config): UserManagement {
  return new UserManagement(config);
}
