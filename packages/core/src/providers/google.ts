// Google provider implementation

import { BaseProvider } from './base.js';
import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk } from './types.js';

export class GoogleProvider extends BaseProvider implements Provider {
  id = 'google';
  name = 'Google';
  icon = '🔴';
  description = 'Gemini 3.x, Flash';
  requires_key = true;
  capabilities: ProviderCapabilities = {
    models_list: true,
    streaming: true,
    tools: true,
    vision: true,
    system_prompts: true,
    parallel_calls: true,
  };
  default_base_url = 'https://generativelanguage.googleapis.com/v1beta';

  private modelMap: Record<string, ModelInfo> = {
    'gemini-1.5-pro': {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      context_window: 2097152,
      max_output_tokens: 8192,
      supports_tools: true,
      supports_vision: true,
    },
    'gemini-1.5-flash': {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      context_window: 1048576,
      max_output_tokens: 8192,
      supports_tools: true,
      supports_vision: true,
    },
    'gemini-1.0-pro': {
      id: 'gemini-1.0-pro',
      name: 'Gemini 1.0 Pro',
      provider: 'google',
      context_window: 32768,
      max_output_tokens: 2048,
      supports_tools: true,
      supports_vision: false,
    },
    'gemini-pro-vision': {
      id: 'gemini-pro-vision',
      name: 'Gemini Pro Vision',
      provider: 'google',
      context_window: 16384,
      max_output_tokens: 2048,
      supports_tools: false,
      supports_vision: true,
    },
  };

  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    if (!key || key.length < 10) {
      return { valid: false, error: 'Invalid Google API key format' };
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
    const response = await this.makeRequest(`/models/${options.model.split('/').pop()}:generateContent`, {
      method: 'POST',
      body: JSON.stringify(this.toGoogleFormat(options)),
    }, options.model.split('/').pop() || options.model);

    return this.fromGoogleFormat(response);
  }

  async *completeStream(options: CompletionOptions): AsyncIterable<StreamChunk> {
    const response = await this.makeStreamRequest(`/models/${options.model.split('/').pop()}:streamGenerateContent`, {
      method: 'POST',
      body: JSON.stringify(this.toGoogleFormat(options, true)),
    }, options.model.split('/').pop() || options.model);

    // For simplicity, we'll convert to regular response and simulate streaming
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

  private toGoogleFormat(options: CompletionOptions, stream = false): Record<string, unknown> {
    return {
      contents: options.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role === 'user' ? 'user' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      })),
      generationConfig: {
        temperature: options.temperature,
        topP: options.top_p,
        maxOutputTokens: options.max_tokens,
        stopSequences: options.stop,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
      tools: options.tools ? [{
        functionDeclarations: options.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }))
      }] : undefined,
      systemInstruction: options.system ? {
        parts: [{ text: options.system }],
      } : undefined,
    };
  }

  private fromGoogleFormat(data: any): CompletionResponse {
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const finishReasonMap: Record<string, 
      | 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'> = {
      STOP: 'stop',
      MAX_TOKENS: 'length',
      SAFETY: 'content_filter',
      RECITATION: 'content_filter',
      OTHER: 'error',
    };

    return {
      id: `google-${Date.now()}`,
      model: `google/${options.model.split('/').pop() || options.model}`,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: finishReasonMap[data.candidates?.[0]?.finishReason?.toUpperCase() || 'OTHER'] || 'error',
      }],
      usage: data.usageMetadata
        ? {
            prompt_tokens: data.usageMetadata.promptTokenCount,
            completion_tokens: data.usageMetadata.candidatesTokenCount,
            total_tokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      created: Math.floor(Date.now() / 1000),
    };
  }
}