// Agent types — orchestrator, multi-model, conversational

export type AgentRole = 'orchestrator' | 'coder' | 'researcher' | 'reviewer' | 'designer' | 'analyst' | 'all';

export interface AgentConfig {
  role: AgentRole;
  model: string;
  provider: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OrchestratorConfig {
  model: string;
  provider: string;
  systemPrompt?: string;
  agents: AgentConfig[];
}

export interface ConversationalConfig {
  models: Array<{
    id: string;
    provider: string;
    systemPrompt?: string;
  }>;
  orchestrator: string;
  parallel: boolean;
}

export interface AgentMessage {
  role: AgentRole;
  model: string;
  provider: string;
  content: string;
  timestamp: number;
}

export interface TaskDecomposition {
  originalPrompt: string;
  subtasks: Array<{
    role: AgentRole;
    prompt: string;
    dependencies?: number[];
  }>;
}

export interface SynthesisInput {
  prompt: string;
  responses: AgentMessage[];
  orchestratorModel: string;
}