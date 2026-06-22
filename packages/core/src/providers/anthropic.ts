// Anthropic provider implementation

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class AnthropicProvider extends BaseProvider implements Provider {
  id = 'anthropic';
  name = 'Anthropic';
  icon = '🤖';
  description = 'Claude models (Opus, Sonnet, Haiku)';
  requires_key = true;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: true,
    system_prompts: true,
    parallel_calls: false,
  };
  default_base_url = 'https://api.anthropic.com';

  private modelMap: Record<string, ModelInfo> = {
    'claude-3-opus-20240229': {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      context_window: 200000,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: true,
    },
    'claude-3-sonnet-20240229': {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      context_window: 200000,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: true,
    },
    'claude-3-haiku-20240307': {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      context_window: 200000,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: true,
    },
    'claude-3-5-sonnet-20241022': {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      context_window: 200000,
      max_output_tokens: 8192,
      supports_tools: true,
      supports_vision: true,
    },
  };

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (!key || !key.startsWith('sk-ant-')) {
      return { valid: false, error: 'Invalid Anthropic key format' };
    }
    
    try {
      await this.makeRequest('/v1/messages', {
        method: 'POST',
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
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
    const response = await this.makeRequest('/v1/messages', {
      method: 'POST',
      body: JSON.stringify(this.toAnthropicFormat(options)),
    }, options.model.split('/').pop() || options.model);

    return this.fromAnthropicFormat(response);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    const response = await this.makeStreamRequest('/v1/messages', {
      method: 'POST',
      body: JSON.stringify(this.toAnthropicFormat(options, true)),
    }, options.model.split('/').pop() || options.model);

    const stream = this.parseSSEStream(response);
    for await (const chunk of stream) {
      yield this.fromAnthropicStreamFormat(chunk);
    }
  }

  private toAnthropicFormat(options: CompletionOptions, stream = false): Record<string, unknown> {
    const systemMsg = options.messages.find(m => m.role === 'system');
    const system = systemMsg ? typeof systemMsg.content === 'string' ? systemMsg.content : '' : options.system || '';
    const messages = options.messages.filter(m => m.role !== 'system');

    const payload: Record<string, unknown> = {
      model: options.model.split('/').pop() || options.model,
      max_tokens: options.max_tokens ?? 4096,
      temperature: options.temperature,
      stream,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
    };

    if (system) payload.system = system;
    if (options.tools) payload.tools = options.tools;
    if (options.tool_choice) payload.tool_choice = options.tool_choice;
    if (options.stop) payload.stop = options.stop;
    if (options.metadata) payload.metadata = options.metadata;

    return payload;
  }

  private fromAnthropicFormat(data: any): CompletionResponse {
    return {
      id: data.id,
      model: `anthropic/${data.model}`,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: Array.isArray(data.content)
            ? data.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('\n')
            : data.content,
        },
        finish_reason: this.anthropicToFinishReason(data.stop_reason),
      }],
      usage: data.usage
        ? {
            prompt_tokens: data.usage.input_tokens,
            completion_tokens: data.usage.output_tokens,
            total_tokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      created: Math.floor(Date.now() / 1000),
    };
  }

  private fromAnthropicStreamFormat(data: any): StreamChunk {
    return {
      id: data.id || `stream-${Date.now()}`,
      model: `anthropic/${data.model || ''}`,
      choices: [{
        index: 0,
        delta: this.anthropicDeltaToDelta(data.delta || {}),
        finish_reason: data.stop_reason ? this.anthropicToFinishReason(data.stop_reason) : null,
      }],
      created: Math.floor(Date.now() / 1000),
    };
  }

  private anthropicDeltaToDelta(delta: any): Partial<ChatMessage> {
    const result: Partial<ChatMessage> = {};
    
    if (delta.type === 'text_delta') {
      result.content = delta.text;
    } else if (delta.type === 'input_json_delta') {
      // Tool use input streaming
      if (!result.content) result.content = '';
      result.content += delta.partial_json;
    }
    
    return result;
  }

  private anthropicToFinishReason(reason: string | null): 
    | 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'stop_sequence': return 'stop';
      case 'tool_use': return 'tool_calls';
      case 'refusal': return 'content_filter';
      default: return 'error';
    }
  }
}