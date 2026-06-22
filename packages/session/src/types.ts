// Session types

export interface Session {
  id: string;
  title: string;
  mode: 'single' | 'multi' | 'conversational';
  modelConfig: {
    provider: string;
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
  createdAt: number;
  updatedAt: number;
  directory: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  agent?: string; // For multi-model: which agent/model
  modelId?: string; // The actual model used
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface MessagePart {
  id: string;
  messageId: string;
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking';
  content: string;
  meta?: Record<string, unknown>;
}

export interface SessionStoreOptions {
  dbPath?: string;
}