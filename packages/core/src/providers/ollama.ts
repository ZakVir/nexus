// Ollama provider implementation

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class OllamaProvider extends BaseProvider implements Provider {
  id = 'ollama';
  name = 'Ollama';
  icon = '🦙';
  description = 'Local models (auto-detected)';
  requires_key = false;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: true,
    system_prompts: true,
    parallel_calls: false,
  };
  default_base_url = 'http://localhost:11434';

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    // Ollama doesn't require a key, but we can check if the server is reachable
    try {
      await this.makeRequest('/api/tags', {
        method: 'GET',
      }, ''); // Empty key for Ollama
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  async listModels(key: string): Promise<ModelInfo[]> {
    // Key is ignored for Ollama
    try {
      const data = await this.makeRequest('/api/tags', {
        method: 'GET',
      }, '');
      
      return data.models.map((model: any) => {
        // Parse model name to extract size/info
        const nameParts = model.name.split(':');
        const modelName = nameParts[0];
        const tag = nameParts[1] || 'latest';
        
        // Estimate context window based on model name (rough estimates)
        let contextWindow = 2048; // Default
        let maxOutputTokens = 2048; // Default
        
        if (modelName.includes('llama3')) {
          contextWindow = 8192;
          maxOutputTokens = 4096;
        } else if (modelName.includes('mistral') || modelName.includes('mixtral')) {
          contextWindow = 32768;
          maxOutputTokens = 4096;
        } else if (modelName.includes('phi') || modelName.includes('gemma')) {
          contextWindow = 8192;
          maxOutputTokens = 2048;
        }
        
        return {
          id: model.name,
          name: `${modelName} (${tag})`,
          provider: 'ollama',
          context_window: contextWindow,
          max_output_tokens: maxOutputTokens,
          supports_tools: true, // Assume tools support for newer models
          supports_vision: model.name.includes('llava') || model.name.includes('bakllava'),
          metadata: {
            size: model.size,
            digest: model.digest,
            modified_at: model.modified_at,
          }
        };
      });
    } catch (error) {
      // Return empty list if Ollama is not available
      return [];
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const response = await this.makeRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify(this.toOllamaFormat(options)),
    }, '');

    return this.fromOllamaFormat(response);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    const response = await this.makeStreamRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify(this.toOllamaFormat(options, true)),
    }, '');

    const stream = this.parseSSEStream(response);
    for await (const chunk of stream) {
      yield this.fromOllamaStreamFormat(chunk);
    }
  }

  private toOllamaFormat(options: CompletionOptions, stream = false): Record<string, unknown> {
    const messages = options.messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content,
    }));
    
    // Ollama expects a different format for options
    const format: Record<string, unknown> = {
      model: options.model,
      messages,
      stream,
    };
    
    if (options.temperature !== undefined) format.temperature = options.temperature;
    if (options.max_tokens !== undefined) format.num_predict = options.max_tokens;
    if (options.top_p !== undefined) format.top_p = options.top_p;
    if (options.stop) format.stop = options.stop;
    if (options.system) format.system = options.system;
    
    return format;
  }

  private fromOllamaFormat(data: any): CompletionResponse {
    return {
      id: `ollama-${Date.now()}`,
      model: `ollama/${data.model || 'unknown'}`,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.message.content,
        },
        finish_reason: data.done_reason ? 
                     (data.done_reason === 'stop' ? 'stop' : 
                      data.done_reason === 'length' ? 'length' : 
                      'error') : 
                     'stop',
      }],
      usage: data.prompt_eval_count && data.eval_count
        ? {
            prompt_tokens: data.prompt_eval_count,
            completion_tokens: data.eval_count,
            total_tokens: data.prompt_eval_count + data.eval_count,
          }
        : undefined,
      created: Math.floor(Date.now() / 1000),
    };
  }

  private fromOllamaStreamFormat(data: any): StreamChunk {
    return {
      id: `ollama-${Date.now()}-${Math.random()}`,
      model: `ollama/${data.model || 'unknown'}`,
      choices: [{
        index: 0,
        delta: {
          role: 'assistant',
          content: data.message?.content || '',
        },
        finish_reason: data.done ? 
                     (data.done_reason === 'stop' ? 'stop' : 
                      data.done_reason === 'length' ? 'length' : 
                      'error') : 
                     null,
      }],
      created: Math.floor(Date.now() / 1000),
    };
  }
}