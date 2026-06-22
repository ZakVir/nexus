// Configuration schema with Zod validation

import { z } from 'zod';
import type { NexusConfig, OperatingMode, ProviderConfig, AgentConfig, ConversationalConfig, KeybindConfig, TUIConfig, HeadlessConfig } from './types.js';

export const OperatingModeSchema = z.enum(['single', 'multi', 'conversational']);

export const ProviderConfigSchema: z.ZodType<ProviderConfig> = z.object({
  enabled: z.boolean(),
  base_url: z.string().url().optional(),
  custom_headers: z.record(z.string()).optional(),
});

export const AgentRoleConfigSchema = z.object({
  model: z.string().min(1),
  provider: z.string().min(1),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

export const AgentConfigSchema: z.ZodType<AgentConfig> = z.object({
  orchestrator: AgentRoleConfigSchema,
  coder: AgentRoleConfigSchema.optional(),
  researcher: AgentRoleConfigSchema.optional(),
  reviewer: AgentRoleConfigSchema.optional(),
  designer: AgentRoleConfigSchema.optional(),
  analyst: AgentRoleConfigSchema.optional(),
});

export const ConversationalConfigSchema: z.ZodType<ConversationalConfig> = z.object({
  models: z.array(z.string().min(1)).min(1),
  orchestrator: z.string().min(1),
  parallel: z.boolean(),
  system_prompts: z.record(z.string()).optional(),
});

export const KeybindConfigSchema: z.ZodType<KeybindConfig> = z.object({
  leader: z.string().default('ctrl+x'),
});

export const TUIConfigSchema: z.ZodType<TUIConfig> = z.object({
  prompt_max_width: z.union([z.number().int().positive(), z.literal('auto')]).default('auto'),
  sidebar: z.enum(['auto', 'always', 'never']).default('auto'),
  diff_style: z.enum(['auto', 'inline', 'side-by-side']).default('auto'),
});

export const HeadlessConfigSchema: z.ZodType<HeadlessConfig> = z.object({
  default_output: z.enum(['text', 'json', 'markdown']).default('json'),
  timeout: z.number().int().positive().default(120),
});

export const NexusConfigSchema: z.ZodType<NexusConfig> = z.object({
  version: z.number().int().positive().default(1),
  project_name: z.string().min(1).max(50),
  mode: OperatingModeSchema.default('single'),
  theme: z.string().min(1).default('nexus'),
  providers: z.record(ProviderConfigSchema).default({}),
  models: z.record(z.array(z.string())).default({}),
  model_aliases: z.record(z.string()).default({}),
  agents: AgentConfigSchema.optional(),
  conversational: ConversationalConfigSchema.optional(),
  keybinds: KeybindConfigSchema.default({ leader: 'ctrl+x' }),
  tui: TUIConfigSchema.default({}),
  headless: HeadlessConfigSchema.default({}),
});

export const DEFAULT_CONFIG: NexusConfig = {
  version: 1,
  project_name: '',
  mode: 'single',
  theme: 'nexus',
  providers: {},
  models: {},
  model_aliases: {},
  agents: undefined,
  conversational: undefined,
  keybinds: { leader: 'ctrl+x' },
  tui: { prompt_max_width: 'auto', sidebar: 'auto', diff_style: 'auto' },
  headless: { default_output: 'json', timeout: 120 },
};

export function validateConfig(config: unknown): NexusConfig {
  return NexusConfigSchema.parse(config);
}

export function mergeConfig(base: NexusConfig, override: Partial<NexusConfig>): NexusConfig {
  return NexusConfigSchema.parse({ ...base, ...override });
}