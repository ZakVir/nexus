// Cohere provider implementation

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class CohereProvider extends BaseProvider implements Provider {
  id = 'cohere';
  name = 'Cohere';
  icon = '🟡';
  description = 'North family, Command R';
  requires_key = true;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: false,
    system_prompts: true,
    parallel_calls: true,
  };
  default_base_url = 'https://api.cohere.com/v1';

  private modelMap: Record<string, ModelInfo> = {
    'command-r-plus': {
      id: 'command-r-plus',
      name: 'Command R Plus',
      provider: 'cohere',
      context_window: 128000,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'command-r': {
      id: 'command-r',
      name: 'Command R',
      provider: 'cohere',
      context_window: 128000,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'command': {
      id: 'command',
      name: 'Command',
      provider: 'cohere',
      context_window: 8192,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'command-light': {
      id: 'command-light',
      name: 'Command Light',
      provider: 'cohere',
      context_window: 8192,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'embed-english-v3': {
      id: 'embed-english-v3',
      name: 'Embed English V3',
      provider: 'cohere',
      context_window: 512,
      max_output_tokens: 0, // Embedding model
      supports_tools: false,
      supports_vision: false,
    },
  };

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (!key || !key.startsWith('co-')) {
      return { valid: false, error: 'Invalid Cohere key format' };
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
    return Object.values(this.modelMap);
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const response = await this.makeRequest('/chat', {
      method: 'POST',
      body: JSON.stringify(this.toCohereFormat(options)),
    }, options.model);

    return this.fromCohereFormat(response);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    const response = await this.makeStreamRequest('/chat', {
      method: 'POST',
      body: JSON.stringify(this.toCohereFormat(options, true)),
    }, options.model);

    // Cohere streaming is different, we'll simulate for now
    const result = await this.complete(options);
    yield {
      id: result.id,
      model: result.model,
      choices: [{
        index: 0,
        delta: {
          content: result.choices[0].message.content,
        },
        finish_reason: null,
      }],
      created: result.created,
    };
    yield {
      id: result.id,
      model: result.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: result.choices[0].finish_reason,
      }],
      created: result.created + 1,
    };
  }

  private toCohereFormat(options: CompletionOptions, stream = false): Record<string, unknown> {
    return {
      model: options.model,
      messages: options.messages.map(m => ({
        role: m.role,
        message: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream,
      p: options.top_p,
      stop_sequences: options.stop,
    };
  }

  private fromCohereFormat(data: any): CompletionResponse {
    return {
      id: data.generation_id || `cohere-${Date.now()}`,
      model: `cohere/unknown`, // We don't have the model info in the response
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.text,
        },
        finish_reason: data.finish_reason?.toLowerCase() === 'COMPLETE' ? 'stop' : 
                     data.finish_reason?.toLowerCase() === 'MAX_TOKENS' ? 'length' : 
                     data.finish_reason?.toLowerCase() === 'ERROR' ? 'error' : 
                     data.finish_reason?.toLowerCase() === 'TOXIC' ? 'content_filter' : 'error',
      }],
      usage: data.meta?.billed_units
        ? {
            prompt_tokens: data.meta.billed_units.input_tokens,
            completion_tokens: data.meta.billed_units.output_tokens,
            total_tokens: data.meta.billed_units.input_tokens + data.meta.billed_units.output_tokens,
          }
        : undefined,
      created: Math.floor(Date.now() / 1000),
    };
  }
}