// Orchestrator — decomposes tasks, routes to agents, synthesizes output

import type { AgentRole, AgentConfig, TaskDecomposition, SynthesisInput, AgentMessage } from './types.js';

export class Orchestrator {
  private config: AgentConfig[];
  private defaultModel: string;

  constructor(config: AgentConfig[], defaultModel: string) {
    this.config = config;
    this.defaultModel = defaultModel;
  }

  /**
   * Decompose a user prompt into subtasks for different agents.
   */
  decompose(prompt: string): TaskDecomposition {
    // Simple heuristic decomposition
    // In production, this would use the orchestrator model
    const subtasks: TaskDecomposition['subtasks'] = [];

    // Determine which agents are needed based on prompt content
    const needsCoder = /code|implement|write|create|build|fix|refactor|debug/i.test(prompt);
    const needsResearcher = /research|find|search|investigate|analyze|compare/i.test(prompt);
    const needsReviewer = /review|check|audit|validate|test|verify/i.test(prompt);
    const needsDesigner = /design|ui|ux|layout|style|visual|interface/i.test(prompt);

    if (needsCoder) {
      subtasks.push({ role: 'coder', prompt });
    }
    if (needsResearcher) {
      subtasks.push({ role: 'researcher', prompt });
    }
    if (needsReviewer) {
      subtasks.push({ role: 'reviewer', prompt, dependencies: [0] });
    }
    if (needsDesigner) {
      subtasks.push({ role: 'designer', prompt });
    }

    // Fallback: use the 'all' role
    if (subtasks.length === 0) {
      subtasks.push({ role: 'all', prompt });
    }

    return { originalPrompt: prompt, subtasks };
  }

  /**
   * Synthesize responses from multiple agents into a final answer.
   */
  synthesize(input: SynthesisInput): string {
    const { prompt, responses } = input;

    if (responses.length === 0) {
      return 'No responses received from agents.';
    }

    if (responses.length === 1) {
      return responses[0].content;
    }

    // Combine responses with attribution
    const parts: string[] = [];
    parts.push(`Based on analysis from ${responses.length} agents:\n`);

    for (const response of responses) {
      const roleName = response.role.charAt(0).toUpperCase() + response.role.slice(1);
      const modelName = response.model.split('/').pop() || response.model;
      parts.push(`### ${roleName} (${modelName})\n`);
      parts.push(response.content);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Get agent config for a specific role.
   */
  getAgentForRole(role: AgentRole): AgentConfig | undefined {
    if (role === 'all') {
      return this.config.find(c => c.role === 'all') || this.config[0];
    }
    return this.config.find(c => c.role === role);
  }

  /**
   * Get all available roles.
   */
  getAvailableRoles(): AgentRole[] {
    return this.config.map(c => c.role);
  }
}