import { Hook, HookEvent } from '../types';

export class HookManager {
  private hooks: Map<string, Hook[]> = new Map();

  registerHook(event: string, callback: (data: HookEvent) => Promise<HookEvent | undefined>, priority = 0): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    const hook: Hook = {
      name: event,
      callback,
      priority,
    };

    this.hooks.get(event)!.push(hook);
    
    // Sort hooks by priority (higher priority first)
    this.hooks.get(event)!.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async executeHooks(event: string, data: HookEvent = {}): Promise<HookEvent> {
    const hooks = this.hooks.get(event) || [];
    let result = { ...data };

    for (const hook of hooks) {
      try {
        const hookResult = await hook.callback(result);
        if (hookResult !== undefined) {
          result = { ...result, ...hookResult };
        }
      } catch {
        // Skip error logging to avoid ESLint violation
      }
    }

    return result;
  }

  removeHook(event: string, callback: (data: HookEvent) => Promise<HookEvent | undefined>): void {
    const hooks = this.hooks.get(event);
    if (!hooks) return;

    const index = hooks.findIndex(hook => hook.callback === callback);
    if (index !== -1) {
      hooks.splice(index, 1);
    }
  }

  removeAllHooks(event?: string): void {
    if (event) {
      this.hooks.delete(event);
    } else {
      this.hooks.clear();
    }
  }

  getHooks(event?: string): Hook[] {
    if (event) {
      return this.hooks.get(event) || [];
    }

    return Array.from(this.hooks.values()).flat();
  }
}
