// Engine — resolves provider + model + key from config, runs real completions.
// This is the shared core used by the CLI (headless + TUI), MCP server, and agent runners.

import {
  providerRegistry,
  type NexusConfig,
  type CompletionOptions,
  type ChatMessage,
  type TokenUsage,
} from '@nexus-ai/core';

/** Error carrying a Nexus CLI exit code (see §6.4 of the spec). */
export class NexusError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'NexusError';
  }
}

export interface EngineRequest {
  prompt?: string;
  messages?: ChatMessage[];
  model?: string;
  provider?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ResolvedTarget {
  providerId: string;
  model: string;
}

export interface RunResult {
  text: string;
  model: string;
  providerId: string;
  usage?: TokenUsage;
}

/** Best-effort provider inference from a model id when none is given explicitly. */
function inferProviderFromModel(model: string): string | undefined {
  if (/^(claude|anthropic\/)/i.test(model)) return 'anthropic';
  if (/^(gpt|o[134]|openai\/)/i.test(model)) return 'openai';
  if (/^(gemini|google\/)/i.test(model)) return 'google';
  if (model.includes('/')) return 'openrouter'; // vendor/model style → OpenRouter
  return undefined;
}

export function resolveTarget(config: NexusConfig, req: EngineRequest): ResolvedTarget {
  const enabled = Object.entries(config.providers || {})
    .filter(([, v]) => (v as { enabled?: boolean })?.enabled)
    .map(([k]) => k);

  let providerId = req.provider;
  let model = req.model;

  if (!providerId && model) providerId = inferProviderFromModel(model);
  if (!providerId) providerId = config.agents?.orchestrator?.provider || enabled[0];
  if (!providerId) {
    throw new NexusError(
      'No provider configured. Run `nexus-cli setup` or pass --provider.',
      2
    );
  }

  if (!model) {
    const list = (config.models && config.models[providerId]) || [];
    model = list[0] || config.agents?.orchestrator?.model;
  }
  if (!model) {
    throw new NexusError(
      `No model specified for provider "${providerId}". Pass --model or configure one.`,
      2
    );
  }

  return { providerId, model };
}

/** Resolve a provider instance with its base URL + API key applied. */
export function prepareProvider(
  config: NexusConfig,
  keys: Record<string, string>,
  providerId: string
) {
  const entry = providerRegistry.get(providerId);
  if (!entry) throw new NexusError(`Unknown provider: ${providerId}`, 2);

  const provider = entry.provider;
  const pcfg = config.providers?.[providerId] as { base_url?: string } | undefined;
  if (pcfg?.base_url) provider.setBaseUrl(pcfg.base_url);

  const key = keys[providerId];
  if (provider.requires_key && !key) {
    throw new NexusError(
      `Missing API key for "${providerId}". Add it to ~/.nexus/keys.json or run \`nexus-cli setup\`.`,
      2
    );
  }
  if (key) provider.setApiKey(key);
  return provider;
}

function buildOptions(target: ResolvedTarget, req: EngineRequest, stream: boolean): CompletionOptions {
  const messages: ChatMessage[] =
    req.messages ?? [{ role: 'user', content: req.prompt ?? '' }];
  return {
    model: target.model,
    messages,
    system: req.system,
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stream,
  };
}

function extractText(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c) => (c.type === 'text' ? c.text ?? '' : '')).join('');
  }
  return '';
}

/** Streaming completion — yields text deltas as they arrive. */
export async function* streamText(
  config: NexusConfig,
  keys: Record<string, string>,
  req: EngineRequest
): AsyncGenerator<string> {
  const target = resolveTarget(config, req);
  const provider = prepareProvider(config, keys, target.providerId);
  const options = buildOptions(target, req, true);

  try {
    for await (const chunk of provider.completeStream(options)) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) yield delta;
    }
  } catch (err) {
    throw new NexusError(err instanceof Error ? err.message : 'Provider error', 3);
  }
}

/** Non-streaming completion — returns the full text plus usage. */
export async function runText(
  config: NexusConfig,
  keys: Record<string, string>,
  req: EngineRequest
): Promise<RunResult> {
  const target = resolveTarget(config, req);
  const provider = prepareProvider(config, keys, target.providerId);
  const options = buildOptions(target, req, false);

  let res;
  try {
    res = await provider.complete(options);
  } catch (err) {
    throw new NexusError(err instanceof Error ? err.message : 'Provider error', 3);
  }

  return {
    text: extractText(res.choices?.[0]?.message?.content ?? ''),
    model: `${target.providerId}/${target.model}`,
    providerId: target.providerId,
    usage: res.usage,
  };
}

/**
 * A thin completion closure bound to a config + keys, used by the multi-model
 * and conversational runners so they don't need to know about the registry.
 */
export type CompleteFn = (req: EngineRequest) => Promise<string>;

export function makeCompleteFn(
  config: NexusConfig,
  keys: Record<string, string>
): CompleteFn {
  return async (req) => (await runText(config, keys, req)).text;
}
