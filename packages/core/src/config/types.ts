// Configuration types for Nexus

export interface NexusConfig {
  version: number;
  project_name: string;
  mode: OperatingMode;
  theme: string;
  providers: Record<string, ProviderConfig>;
  models: Record<string, string[]>;
  model_aliases: Record<string, string>;
  agents?: AgentConfig;
  conversational?: ConversationalConfig;
  keybinds: KeybindConfig;
  tui: TUIConfig;
  headless: HeadlessConfig;
}

export type OperatingMode = 'single' | 'multi' | 'conversational';

export interface ProviderConfig {
  enabled: boolean;
  base_url?: string;
  custom_headers?: Record<string, string>;
}

export interface AgentConfig {
  orchestrator: AgentRoleConfig;
  coder?: AgentRoleConfig;
  researcher?: AgentRoleConfig;
  reviewer?: AgentRoleConfig;
  designer?: AgentRoleConfig;
  analyst?: AgentRoleConfig;
}

export interface AgentRoleConfig {
  model: string;
  provider: string;
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ConversationalConfig {
  models: string[];
  orchestrator: string;
  parallel: boolean;
  system_prompts?: Record<string, string>;
}

export interface KeybindConfig {
  leader: string;
}

export interface TUIConfig {
  prompt_max_width: number | 'auto';
  sidebar: 'auto' | 'always' | 'never';
  diff_style: 'auto' | 'inline' | 'side-by-side';
}

export interface HeadlessConfig {
  default_output: 'text' | 'json' | 'markdown';
  timeout: number;
}

export interface CLIArgs {
  // Commands
  command?: string;
  
  // Setup
  setup?: boolean;
  
  // Headless flags
  prompt?: string;
  pipe?: boolean;
  print?: boolean;
  json?: boolean;
  oneshot?: boolean;
  
  // Model/Provider selection
  model?: string;
  provider?: string;
  mode?: OperatingMode;
  
  // Session
  session?: string;
  
  // Output
  no_color?: boolean;
  timeout?: number;
  max_tokens?: number;
  system?: string;
  output_format?: 'text' | 'json' | 'markdown';
  
  // MCP
  serve?: boolean;
  mcp?: boolean;
  
  // Version/Help
  version?: boolean;
  help?: boolean;
  
  // Environment
  headless?: boolean;
}

export interface ProjectNameData {
  adjectives: string[];
  nouns: string[];
}