// Base provider class with common functionality

import type { Provider, ModelInfo, ProviderCapabilities, ChatMessage, ToolDefinition, CompletionOptions, CompletionResponse, StreamChunk, TokenUsage } from './types.js';

export abstract class BaseProvider implements Provider {
  abstract id: string;
  abstract name: string;
  abstract icon: string;
  abstract description: string;
  abstract requires_key: boolean;
  abstract capabilities: ProviderCapabilities;
  default_base_url?: string;

  protected baseUrl: string;
  protected headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || this.default_base_url || '';
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  abstract validateKey(key: string): Promise<{ valid: boolean; error?: string }>;
  abstract listModels(key: string): Promise<ModelInfo[]>;
  abstract complete(options: CompletionOptions): Promise<CompletionResponse>;
  abstract completeStream(options: CompletionOptions): AsyncIterable<StreamChunk>;

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    key: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
        'Authorization': `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.name} API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  protected async makeStreamRequest(
    endpoint: string,
    options: RequestInit,
    key: string
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
        'Authorization': `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.name} API error (${response.status}): ${errorText}`);
    }

    return response;
  }

  protected parseSSEStream(response: Response): AsyncIterable<StreamChunk> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    return {
      [Symbol.asyncIterator](): AsyncIterator<StreamChunk> {
        return {
          async next(): Promise<IteratorResult<StreamChunk>> {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                return { done: true, value: undefined as any };
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') {
                    return { done: true, value: undefined as any };
                  }
                  try {
                    return { done: false, value: JSON.parse(data) };
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            }
          },
        };
      },
    };
  }

  protected formatMessages(messages: ChatMessage[], system?: string): ChatMessage[] {
    const formatted: ChatMessage[] = [];
    
    if (system) {
      formatted.push({ role: 'system', content: system });
    }
    
    for (const msg of messages) {
      formatted.push(msg);
    }
    
    return formatted;
  }

  protected calculateUsage(promptTokens: number, completionTokens: number): TokenUsage {
    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
  }
}