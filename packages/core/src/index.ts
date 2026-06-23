// Core types and exports for Nexus

// Configuration
// Note: ProviderConfig is re-exported from ./providers/types.js (identical shape)
// to avoid an ambiguous duplicate export.
export type {
  NexusConfig,
  OperatingMode,
  AgentConfig,
  AgentRoleConfig,
  ConversationalConfig,
  KeybindConfig,
  TUIConfig,
  HeadlessConfig,
  CLIArgs,
  ProjectNameData,
} from './config/types.js';
export * from './config/schema.js';
export * from './config/manager.js';

// Providers
export * from './providers/types.js';
export * from './providers/base.js';
export * from './providers/registry.js';
export * from './providers/definitions.js';
export * from './providers/anthropic.js';
export * from './providers/openrouter.js';
export * from './providers/nvidia.js';
export * from './providers/openai.js';
export * from './providers/google.js';
export * from './providers/groq.js';
export * from './providers/mistral.js';
export * from './providers/cohere.js';
export * from './providers/ollama.js';
export * from './providers/custom.js';

// Utilities
export { generateProjectName } from './utils/project-name.js';