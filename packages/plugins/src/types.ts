// Plugin types — slot-based architecture

/** Slot names where plugins can render content */
export type PluginSlot =
  | 'home_logo'
  | 'home_prompt'
  | 'home_footer'
  | 'sidebar_title'
  | 'sidebar_content'
  | 'session_prompt'
  | 'session_prompt_right';

/** Plugin manifest — what a plugin exports */
export interface PluginManifest {
  /** Unique plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Author name */
  author?: string;
  /** Slot handlers — each returns content to render in that slot */
  slots: Partial<Record<PluginSlot, SlotHandler>>;
  /** Custom slash commands the plugin registers */
  commands?: PluginCommand[];
  /** Custom tools the plugin adds to the model */
  tools?: PluginTool[];
  /** Custom themes the plugin provides */
  themes?: string[];
  /** Custom MCP servers the plugin declares */
  mcpServers?: Record<string, { command: string; args?: string[] }>;
}

/** Slot handler function — receives context, returns content string */
export type SlotHandler = (context: SlotContext) => string | Promise<string>;

/** Context passed to slot handlers */
export interface SlotContext {
  /** Current theme colors */
  theme: Record<string, string>;
  /** Current session info */
  session?: {
    id: string;
    title: string;
    model: string;
    mode: string;
  };
  /** Terminal dimensions */
  termWidth: number;
  termHeight: number;
  /** Current working directory */
  cwd: string;
  /** Plugin's own config (from ~/.nexus/plugins/<name>/config.json) */
  config: Record<string, unknown>;
}

/** Custom slash command */
export interface PluginCommand {
  name: string;
  description: string;
  handler: (args: string) => string | Promise<string>;
}

/** Custom tool definition */
export interface PluginTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<{ output: string; error?: string }>;
}