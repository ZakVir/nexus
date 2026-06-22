// Plugin manager — loads plugins, manages slots

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PluginManifest, PluginSlot, SlotHandler, SlotContext } from './types.js';

const PLUGINS_DIR = join(homedir(), '.nexus', 'plugins');

export class PluginManager {
  private plugins: Map<string, PluginManifest> = new Map();
  private slotHandlers: Map<PluginSlot, SlotHandler[]> = new Map();

  /**
   * Load all plugins from ~/.nexus/plugins/
   */
  loadAll(): void {
    if (!existsSync(PLUGINS_DIR)) return;

    const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const pluginDir = join(PLUGINS_DIR, entry.name);
      const manifestPath = join(pluginDir, 'index.js');
      
      if (!existsSync(manifestPath)) continue;
      
      try {
        this.loadPlugin(pluginDir, entry.name);
      } catch (err) {
        console.error(`Failed to load plugin ${entry.name}:`, err);
      }
    }
  }

  /**
   * Load a single plugin from a directory
   */
  private loadPlugin(pluginDir: string, name: string): void {
    const manifestPath = join(pluginDir, 'index.js');
    
    // Dynamic import
    const manifest = require(manifestPath) as PluginManifest;
    
    if (!manifest.name || !manifest.slots) {
      throw new Error(`Invalid plugin manifest: ${name}`);
    }

    this.plugins.set(manifest.name, manifest);

    // Register slot handlers
    for (const [slot, handler] of Object.entries(manifest.slots)) {
      if (typeof handler === 'function') {
        this.registerSlotHandler(slot as PluginSlot, handler);
      }
    }
  }

  /**
   * Register a slot handler
   */
  registerSlotHandler(slot: PluginSlot, handler: SlotHandler): void {
    const handlers = this.slotHandlers.get(slot) || [];
    handlers.push(handler);
    this.slotHandlers.set(slot, handlers);
  }

  /**
   * Render content for a slot (combines all plugin handlers)
   */
  async renderSlot(slot: PluginSlot, context: SlotContext): Promise<string> {
    const handlers = this.slotHandlers.get(slot) || [];
    const parts: string[] = [];

    for (const handler of handlers) {
      try {
        const result = await handler(context);
        if (result) parts.push(result);
      } catch (err) {
        console.error(`Plugin slot ${slot} handler failed:`, err);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get all registered slash commands
   */
  getCommands(): Array<{ name: string; description: string; handler: (args: string) => string | Promise<string> }> {
    const commands: Array<{ name: string; description: string; handler: (args: string) => string | Promise<string> }> = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.commands) {
        for (const cmd of plugin.commands) {
          commands.push({
            name: `/${cmd.name}`,
            description: cmd.description,
            handler: cmd.handler,
          });
        }
      }
    }
    
    return commands;
  }

  /**
   * Get all registered custom tools
   */
  getTools(): Array<{ name: string; description: string; inputSchema: Record<string, unknown>; handler: (input: Record<string, unknown>) => Promise<{ output: string; error?: string }> }> {
    const tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; handler: (input: Record<string, unknown>) => Promise<{ output: string; error?: string }> }> = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.tools) {
        for (const tool of plugin.tools) {
          tools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            handler: tool.handler,
          });
        }
      }
    }
    
    return tools;
  }

  /**
   * List loaded plugin names
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if a plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
}

export const pluginManager = new PluginManager();