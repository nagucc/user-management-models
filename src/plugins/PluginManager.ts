import { Plugin, StorageAdapter } from '../types';
import { MemoryAdapter } from '../adapters/MemoryAdapter';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private adapters: Map<string, new (options?: Record<string, unknown>) => StorageAdapter> = new Map();

  constructor() {
    // Register built-in adapters
    this.registerBuiltInAdapters();
  }

  private registerBuiltInAdapters(): void {
    // Register built-in adapters directly
    this.registerAdapter('memory', MemoryAdapter);
    this.registerAdapter('file', FileSystemAdapter);
  }

  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  async loadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }

    try {
      await plugin.initialize();
    } catch (error) {
      throw new Error(`Failed to initialize plugin "${name}": ${error}`);
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }

    try {
      await plugin.shutdown();
      this.plugins.delete(name);
    } catch (error) {
      throw new Error(`Failed to unload plugin "${name}": ${error}`);
    }
  }

  registerAdapter(name: string, adapter: new (options?: Record<string, unknown>) => StorageAdapter): void {
    if (this.adapters.has(name)) {
      throw new Error(`Adapter "${name}" already registered`);
    }

    this.adapters.set(name, adapter);
  }

  getAdapter(name: string): new (options?: Record<string, unknown>) => StorageAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter "${name}" not found`);
    }

    return adapter;
  }

  async loadAllPlugins(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await this.loadPlugin(plugin.name);
    }
  }

  async unloadAllPlugins(): Promise<void> {
    for (const pluginName of this.plugins.keys()) {
      await this.unloadPlugin(pluginName);
    }
  }

  getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  getRegisteredAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}
