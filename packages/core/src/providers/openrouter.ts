// OpenRouter provider implementation

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class OpenRouterProvider extends BaseProvider implements Provider {
  id = 'openrouter';
  name = 'OpenRouter';
  icon = '🔀';
  description = '700+ models via single API key';
  requires_key = true;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: true,
    system_prompts: true,
    parallel_calls: true,
  };
  default_base_url = 'https://openrouter.ai/api/v1';

  private modelCache: ModelInfo[] = [];

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (!key || !key.startsWith('sk-or-')) {
      return { valid: false, error: 'Invalid OpenRouter key format' };
    }
    
    try {
      await this.makeRequest('/models', {
        method: 'GET',
      }, key);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  async listModels(key: string): Promise<ModelInfo[]> {
    await this.validateKey(key);
    
    if (this.modelCache.length > 0 && Date.now() < (this.modelCache[0] as any)._cachedAt + 3600000) {
      return this.modelCache;
    }
    
    const data = await this.makeRequest<any>('/models', {
      method: 'GET',
    }, key);

    this.modelCache = data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      provider: 'openrouter',
      context_window: model.context_length ?? 8192,
      max_output_tokens: model.max_completion_tokens ?? 4096,
      supports_tools: model.supports_tools ?? false,
      supports_vision: model.description?.includes('vision') ?? false,
      pricing: {
        input: model.pricing?.prompt ?? 0,
        output: model.pricing?.completion ?? 0,
      },
      metadata: {
        architecture: model.architecture,
        created: model.created,
      }
    }));
    
    // Add cache timestamp
    const now = Date.now();
    this.modelCache.forEach((m: any) => m._cachedAt = now);
    
    return this.modelCache;
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const response = await this.makeRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(this.toOpenAIFormat(options)),
    });

    return this.fromOpenAIFormat(response);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    const response = await this.makeStreamRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(this.toOpenAIFormat(options, true)),
    });

    const stream = this.parseSSEStream(response);
    for await (const chunk of stream) {
      yield this.fromOpenAIStreamFormat(chunk);
    }
  }

  private toOpenAIFormat(options: CompletionOptions, stream = false): Record<string, unknown> {
    // OpenRouter requires the full vendor-qualified model id (e.g. "deepseek/deepseek-v4-flash").
    // Strip only a leading "openrouter/" namespace if the caller added one.
    const modelId = options.model.replace(/^openrouter\//, '');
    const payload: Record<string, unknown> = {
      model: modelId,
      messages: options.messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream,
    };

    if (options.top_p !== undefined) payload.top_p = options.top_p;
    if (options.tools) payload.tools = options.tools;
    if (options.tool_choice) payload.tool_choice = options.tool_choice;
    if (options.stop) payload.stop = options.stop;
    if (options.system) (payload.messages as Array<Record<string, unknown>>).unshift({ role: 'system', content: options.system });

    return payload;
  }

  private fromOpenAIFormat(data: any): CompletionResponse {
    return {
      id: data.id,
      model: `openrouter/${data.model}`,
      choices: data.choices.map((choice: any, index: number) => ({
        index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          tool_calls: choice.message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            }
          })),
        },
        finish_reason: choice.finish_reason,
      })),
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
      created: data.created,
    };
  }

  private fromOpenAIStreamFormat(data: any): StreamChunk {
    return {
      id: data.id,
      model: `openrouter/${data.model}`,
      choices: data.choices.map((choice: any, index: number) => ({
        index,
        delta: {
          role: choice.delta.role,
          content: choice.delta.content,
          tool_calls: choice.delta.tool_calls?.map((tc: any) => ({
            index: tc.index,
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            }
          })),
        },
        finish_reason: choice.finish_reason,
      })),
      created: data.created,
    };
  }
}