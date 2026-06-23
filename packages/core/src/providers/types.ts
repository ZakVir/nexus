// Provider types and base classes

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_tools?: boolean;
  supports_vision?: boolean;
  supports_streaming?: boolean;
  pricing?: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  metadata?: Record<string, unknown>;
}

export interface ProviderCapabilities {
  models_list: boolean;
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  system_prompts: boolean;
  parallel_calls: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ChatContent[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
  tool_use?: { id: string; name: string; input: unknown };
  tool_result?: { tool_use_id: string; content: string; is_error?: boolean };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  system?: string;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

export interface CompletionResponse {
  id: string;
  model: string;
  choices: CompletionChoice[];
  usage?: TokenUsage;
  created: number;
}

export interface CompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface StreamChunk {
  id: string;
  model: string;
  choices: StreamChoice[];
  created: number;
}

export interface StreamChoice {
  index: number;
  delta: Partial<ChatMessage>;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | null;
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  requires_key: boolean;
  capabilities: ProviderCapabilities;
  default_base_url?: string;
  
  // Methods
  setBaseUrl(url: string): void;
  setApiKey(key: string): void;
  validateKey(key: string): Promise<{ valid: boolean; error?: string }>;
  listModels(key: string): Promise<ModelInfo[]>;
  complete(options: CompletionOptions): Promise<CompletionResponse>;
  completeStream(options: CompletionOptions): AsyncIterable<StreamChunk>;
}

export interface ProviderRegistryEntry {
  provider: Provider;
  config: ProviderConfig;
  key?: string;
}

export interface ProviderConfig {
  enabled: boolean;
  base_url?: string;
  custom_headers?: Record<string, string>;
}