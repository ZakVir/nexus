// NVIDIA provider implementation

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class NVIDIAProvider extends BaseProvider implements Provider {
  id = 'nvidia';
  name = 'NVIDIA';
  icon = '🟢';
  description = 'Nemotron, Llama, Mistral (NIM API)';
  requires_key = true;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: false,
    system_prompts: true,
    parallel_calls: true,
  };
  default_base_url = 'https://integrate.api.nvidia.com/v1';

  private modelMap: Record<string, ModelInfo> = {
    'nemotron-3-ultra-550b-a55b': {
      id: 'nemotron-3-ultra-550b-a55b',
      name: 'Nemotron 3 Ultra 550B',
      provider: 'nvidia',
      context_window: 32768,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'nemotron-3-super-120b-a12b': {
      id: 'nemotron-3-super-120b-a12b',
      name: 'Nemotron 3 Super 120B',
      provider: 'nvidia',
      context_window: 32768,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'llama-3.1-nemotron-70b-instruct': {
      id: 'llama-3.1-nemotron-70b-instruct',
      name: 'Llama 3.1 Nemotron 70B Instruct',
      provider: 'nvidia',
      context_window: 32768,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'llama-3.1-nemotron-8b-instruct': {
      id: 'llama-3.1-nemotron-8b-instruct',
      name: 'Llama 3.1 Nemotron 8B Instruct',
      provider: 'nvidia',
      context_window: 32768,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
    'mistral-nemo-instruct-2407': {
      id: 'mistral-nemo-instruct-2407',
      name: 'Mistral Nemo Instruct 2407',
      provider: 'nvidia',
      context_window: 32768,
      max_output_tokens: 4096,
      supports_tools: true,
      supports_vision: false,
    },
  };

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (!key || !key.startsWith('nvapi-')) {
      return { valid: false, error: 'Invalid NVIDIA key format' };
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
    const payload: Record<string, unknown> = {
      model: options.model.split('/').pop() || options.model,
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
      model: `nvidia/${data.model}`,
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
      model: `nvidia/${data.model}`,
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