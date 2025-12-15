import { User, StorageAdapter, QueryOptions, Role } from '../types';
import { HookManager } from '../hooks/HookManager';

export class UserManager {
  constructor(
    private adapter: StorageAdapter,
    private hookManager: HookManager
  ) {}

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Execute pre-create hooks
    const preData = await this.hookManager.executeHooks('user.preCreate', { userData });
    
    const user = await this.adapter.createUser(preData.userData);
    
    // Execute post-create hooks
    await this.hookManager.executeHooks('user.postCreate', { user });
    
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    // Execute pre-get hooks
    const preData = await this.hookManager.executeHooks('user.preGet', { id });
    
    const user = await this.adapter.getUserById(preData.id);
    
    // Execute post-get hooks
    await this.hookManager.executeHooks('user.postGet', { user });
    
    return user;
  }

  async getUsers(options?: QueryOptions): Promise<{ items: User[]; total: number }> {
    // Execute pre-getAll hooks
    const preData = await this.hookManager.executeHooks('user.preGetAll', { options });
    
    const result = await this.adapter.getUsers(preData.options);
    
    // Execute post-getAll hooks
    await this.hookManager.executeHooks('user.postGetAll', { result });
    
    return result;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    // Execute pre-update hooks
    const preData = await this.hookManager.executeHooks('user.preUpdate', { id, userData });
    
    const user = await this.adapter.updateUser(preData.id, preData.userData);
    
    // Execute post-update hooks
    await this.hookManager.executeHooks('user.postUpdate', { user });
    
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Execute pre-delete hooks
    const preData = await this.hookManager.executeHooks('user.preDelete', { id });
    
    const result = await this.adapter.deleteUser(preData.id);
    
    // Execute post-delete hooks
    await this.hookManager.executeHooks('user.postDelete', { id, result });
    
    return result;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    // Execute pre-getRoles hooks
    const preData = await this.hookManager.executeHooks('user.preGetRoles', { userId });
    
    const roles = await this.adapter.getUserRoles(preData.userId);
    
    // Execute post-getRoles hooks
    await this.hookManager.executeHooks('user.postGetRoles', { userId: preData.userId, roles });
    
    return roles;
  }
}
