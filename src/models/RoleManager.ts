import { Role, StorageAdapter, QueryOptions, User } from '../types';
import { HookManager } from '../hooks/HookManager';

export class RoleManager {
  constructor(
    private adapter: StorageAdapter,
    private hookManager: HookManager
  ) {}

  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    // Execute pre-create hooks
    const preData = await this.hookManager.executeHooks('role.preCreate', { roleData });
    
    const role = await this.adapter.createRole(preData.roleData);
    
    // Execute post-create hooks
    await this.hookManager.executeHooks('role.postCreate', { role });
    
    return role;
  }

  async getRoleById(id: string): Promise<Role | null> {
    // Execute pre-get hooks
    const preData = await this.hookManager.executeHooks('role.preGet', { id });
    
    const role = await this.adapter.getRoleById(preData.id);
    
    // Execute post-get hooks
    await this.hookManager.executeHooks('role.postGet', { role });
    
    return role;
  }

  async getRoles(options?: QueryOptions): Promise<{ items: Role[]; total: number }> {
    // Execute pre-getAll hooks
    const preData = await this.hookManager.executeHooks('role.preGetAll', { options });
    
    const result = await this.adapter.getRoles(preData.options);
    
    // Execute post-getAll hooks
    await this.hookManager.executeHooks('role.postGetAll', { result });
    
    return result;
  }

  async updateRole(id: string, roleData: Partial<Role>): Promise<Role | null> {
    // Execute pre-update hooks
    const preData = await this.hookManager.executeHooks('role.preUpdate', { id, roleData });
    
    const role = await this.adapter.updateRole(preData.id, preData.roleData);
    
    // Execute post-update hooks
    await this.hookManager.executeHooks('role.postUpdate', { role });
    
    return role;
  }

  async deleteRole(id: string): Promise<boolean> {
    // Execute pre-delete hooks
    const preData = await this.hookManager.executeHooks('role.preDelete', { id });
    
    const result = await this.adapter.deleteRole(preData.id);
    
    // Execute post-delete hooks
    await this.hookManager.executeHooks('role.postDelete', { id, result });
    
    return result;
  }

  async getRoleUsers(roleId: string): Promise<User[]> {
    // Execute pre-getUsers hooks
    const preData = await this.hookManager.executeHooks('role.preGetUsers', { roleId });
    
    const users = await this.adapter.getRoleUsers(preData.roleId);
    
    // Execute post-getUsers hooks
    await this.hookManager.executeHooks('role.postGetUsers', { roleId: preData.roleId, users });
    
    return users;
  }
}
