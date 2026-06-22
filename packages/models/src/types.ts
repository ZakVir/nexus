// Model types

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_tools?: boolean;
  supports_vision?: boolean;
  pricing?: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  metadata?: Record<string, unknown>;
}

export interface ModelRegistryOptions {
  refreshIntervalMs?: number;
  defaultModels?: ModelInfo[];
}