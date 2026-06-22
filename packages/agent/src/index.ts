// Agent package — public exports

export { Orchestrator } from './orchestrator.js';
export { MultiModelRunner } from './runner.js';
export { ConversationalAgent } from './conversational.js';
export type {
  AgentRole,
  AgentConfig,
  OrchestratorConfig,
  ConversationalConfig,
  AgentMessage,
  TaskDecomposition,
  SynthesisInput,
} from './types.js';