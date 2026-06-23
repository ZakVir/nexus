// Custom provider implementation for OpenAI-compatible endpoints

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class CustomProvider extends BaseProvider implements Provider {
  id = 'custom';
  name = 'Custom / Other';
  icon = '🔧';
  description = 'Bring your own OpenAI-compatible endpoint';
  requires_key = true; // May or may not require key depending on endpoint
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: true,
    system_prompts: true,
    parallel_calls: true,
  };
  default_base_url = ''; // Must be set by user

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.baseUrl) {
      return { valid: false, error: 'Custom endpoint URL not configured' };
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
    if (!this.baseUrl) {
      throw new Error('Custom endpoint URL not configured');
    }
    
    try {
      const data = await this.makeRequest<any>('/models', {
        method: 'GET',
      }, key);

      return data.data.map((model: any) => {
        return {
          id: model.id,
          name: model.id,
          provider: 'custom',
          context_window: model.context_length ?? 8192,
          max_output_tokens: model.max_completion_tokens ?? 4096,
          supports_tools: true, // Assume tools support
          supports_vision: model.id.includes('vision') || model.id.includes('vl') || model.id.includes('visual'),
          metadata: {
            object: model.object,
            created: model.created,
            owned_by: model.owned_by,
          }
        };
      });
    } catch (error) {
      // If models endpoint fails, return empty array
      return [];
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.baseUrl) {
      throw new Error('Custom endpoint URL not configured');
    }
    
    const response = await this.makeRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(this.toOpenAIFormat(options)),
    });

    return this.fromOpenAIFormat(response);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    if (!this.baseUrl) {
      throw new Error('Custom endpoint URL not configured');
    }
    
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
      model: options.model,
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
    if (options.system) {
      const messages = payload.messages as Array<{role: string; content: string}>;
      messages.unshift({ role: 'system', content: options.system });
    }

    return payload;
  }

  private fromOpenAIFormat(data: any): CompletionResponse {
    return {
      id: data.id,
      model: `custom/${data.model || 'unknown'}`,
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
      model: `custom/${data.model || 'unknown'}`,
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