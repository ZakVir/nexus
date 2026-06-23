// Shared base + thin subclasses for OpenAI-compatible providers.
// Anything that speaks the OpenAI /chat/completions + /models shape lives here so
// we don't duplicate the request/parse logic per provider.

import { BaseProvider } from './base.js';
import type {
  Provider,
  ModelInfo,
  ProviderCapabilities,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
} from './types.js';

export abstract class OpenAICompatibleProvider extends BaseProvider implements Provider {
  abstract id: string;
  abstract name: string;
  abstract icon: string;
  abstract description: string;
  requires_key = true;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: false,
    system_prompts: true,
    parallel_calls: true,
  };
  abstract default_base_url: string;

  /** Optional vendor namespace stripped from the model id before sending (e.g. "opencode/"). */
  protected modelPrefix?: string;

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (this.requires_key && !key) {
      return { valid: false, error: `Missing API key for ${this.name}` };
    }
    try {
      await this.makeRequest('/models', { method: 'GET' }, key);
      return { valid: true };
    } catch (error: any) {
      // Some OpenAI-compatible providers don't expose /models; treat a present
      // key as usable rather than a hard failure.
      return key ? { valid: true } : { valid: false, error: error?.message };
    }
  }

  async listModels(key: string): Promise<ModelInfo[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' }, key);
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
      provider: this.id,
      context_window: m.context_length ?? m.context_window ?? undefined,
      max_output_tokens: m.max_completion_tokens ?? undefined,
      supports_tools: m.supports_tools ?? false,
      supports_vision: false,
    }));
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(this.toOpenAIFormat(options)),
    });
    return this.fromOpenAIFormat(data);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    const response = await this.makeStreamRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(this.toOpenAIFormat(options, true)),
    });
    for await (const chunk of this.parseSSEStream(response)) {
      yield this.fromOpenAIStreamFormat(chunk);
    }
  }

  protected resolveModelId(model: string): string {
    return this.modelPrefix ? model.replace(new RegExp(`^${this.modelPrefix}`), '') : model;
  }

  protected toOpenAIFormat(options: CompletionOptions, stream = false): Record<string, unknown> {
    const messages = options.messages.map((m) => ({ role: m.role, content: m.content }));
    if (options.system) messages.unshift({ role: 'system', content: options.system });
    const payload: Record<string, unknown> = {
      model: this.resolveModelId(options.model),
      messages,
      stream,
    };
    if (options.temperature !== undefined) payload.temperature = options.temperature;
    if (options.max_tokens !== undefined) payload.max_tokens = options.max_tokens;
    if (options.top_p !== undefined) payload.top_p = options.top_p;
    if (options.tools) payload.tools = options.tools;
    if (options.tool_choice) payload.tool_choice = options.tool_choice;
    if (options.stop) payload.stop = options.stop;
    return payload;
  }

  protected fromOpenAIFormat(data: any): CompletionResponse {
    return {
      id: data?.id ?? `${this.id}-${Date.now()}`,
      model: `${this.id}/${data?.model ?? ''}`,
      choices: (data?.choices ?? []).map((choice: any, index: number) => ({
        index,
        message: {
          role: choice.message?.role ?? 'assistant',
          content: choice.message?.content ?? '',
          tool_calls: choice.message?.tool_calls,
        },
        finish_reason: choice.finish_reason ?? 'stop',
      })),
      usage: data?.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
      created: data?.created ?? Math.floor(Date.now() / 1000),
    };
  }

  protected fromOpenAIStreamFormat(data: any): StreamChunk {
    return {
      id: data?.id ?? `${this.id}-${Date.now()}`,
      model: `${this.id}/${data?.model ?? ''}`,
      choices: (data?.choices ?? []).map((choice: any, index: number) => ({
        index,
        delta: {
          role: choice.delta?.role,
          content: choice.delta?.content,
          tool_calls: choice.delta?.tool_calls,
        },
        finish_reason: choice.finish_reason ?? null,
      })),
      created: data?.created ?? Math.floor(Date.now() / 1000),
    };
  }
}

// ─── Concrete providers ──────────────────────────────────────────────

export class OpenCodeZenProvider extends OpenAICompatibleProvider {
  id = 'opencode-zen';
  name = 'OpenCode Zen';
  icon = '⊘';
  description = 'OpenCode Zen — pay-as-you-go curated models';
  default_base_url = 'https://opencode.ai/zen/v1';
  protected modelPrefix = 'opencode/';
}

export class OpenCodeGoProvider extends OpenAICompatibleProvider {
  id = 'opencode-go';
  name = 'OpenCode Go';
  icon = '⊛';
  description = 'OpenCode Go — subscription plan, expanded model access';
  default_base_url = 'https://opencode.ai/zen/v1';
  protected modelPrefix = 'opencode/';
}

export class DeepSeekProvider extends OpenAICompatibleProvider {
  id = 'deepseek';
  name = 'DeepSeek';
  icon = '🐋';
  description = 'DeepSeek V3 / R1 — strong, low-cost';
  default_base_url = 'https://api.deepseek.com/v1';
}

export class XAIProvider extends OpenAICompatibleProvider {
  id = 'xai';
  name = 'xAI (Grok)';
  icon = '✕';
  description = 'Grok models from xAI';
  default_base_url = 'https://api.x.ai/v1';
}

export class PerplexityProvider extends OpenAICompatibleProvider {
  id = 'perplexity';
  name = 'Perplexity';
  icon = '⌖';
  description = 'Sonar models with live web grounding';
  default_base_url = 'https://api.perplexity.ai';
}

export class NousPortalProvider extends OpenAICompatibleProvider {
  id = 'nous-portal';
  name = 'Nous Portal';
  icon = '◈';
  description = 'Nous Research — 300+ models with bundled tool use';
  default_base_url = 'https://portal.nousresearch.com/api/v1';
}

export class TogetherProvider extends OpenAICompatibleProvider {
  id = 'together';
  name = 'Together AI';
  icon = '⧉';
  description = 'Open models at scale (Llama, Qwen, DeepSeek, …)';
  default_base_url = 'https://api.together.xyz/v1';
}

export class FireworksProvider extends OpenAICompatibleProvider {
  id = 'fireworks';
  name = 'Fireworks AI';
  icon = '✸';
  description = 'Fast open-model inference';
  default_base_url = 'https://api.fireworks.ai/inference/v1';
}

export class CerebrasProvider extends OpenAICompatibleProvider {
  id = 'cerebras';
  name = 'Cerebras';
  icon = '◧';
  description = 'Ultra-fast inference on Cerebras hardware';
  default_base_url = 'https://api.cerebras.ai/v1';
}

export class DeepInfraProvider extends OpenAICompatibleProvider {
  id = 'deepinfra';
  name = 'DeepInfra';
  icon = '◢';
  description = 'Cost-effective open-model hosting';
  default_base_url = 'https://api.deepinfra.com/v1/openai';
}
