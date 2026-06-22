// Multi-model runner — coordinates multiple AI models

import type { AgentConfig, AgentMessage, TaskDecomposition } from './types.js';
import { Orchestrator } from './orchestrator.js';

export interface MultiModelRunnerOptions {
  orchestrator: Orchestrator;
  providers: Map<string, { complete: (prompt: string, options?: any) => Promise<string> }>;
}

export class MultiModelRunner {
  private orchestrator: Orchestrator;
  private providers: Map<string, { complete: (prompt: string, options?: any) => Promise<string> }>;

  constructor(options: MultiModelRunnerOptions) {
    this.orchestrator = options.orchestrator;
    this.providers = options.providers;
  }

  /**
   * Run a prompt through multiple models based on task decomposition.
   */
  async run(prompt: string): Promise<AgentMessage[]> {
    const decomposition = this.orchestrator.decompose(prompt);
    const responses: AgentMessage[] = [];

    // Run subtasks (could be parallel in production)
    for (const subtask of decomposition.subtasks) {
      const agentConfig = this.orchestrator.getAgentForRole(subtask.role);
      if (!agentConfig) continue;

      const provider = this.providers.get(agentConfig.provider);
      if (!provider) continue;

      const systemPrompt = agentConfig.systemPrompt || this.getDefaultSystemPrompt(subtask.role);
      const fullPrompt = `${systemPrompt}\n\nUser request: ${subtask.prompt}`;

      try {
        const content = await provider.complete(fullPrompt, {
          model: agentConfig.model,
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
        });

        responses.push({
          role: subtask.role,
          model: agentConfig.model,
          provider: agentConfig.provider,
          content,
          timestamp: Date.now(),
        });
      } catch (error) {
        responses.push({
          role: subtask.role,
          model: agentConfig.model,
          provider: agentConfig.provider,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    // Synthesize responses
    const synthesis = this.orchestrator.synthesize({
      prompt,
      responses,
      orchestratorModel: this.orchestrator.getAgentForRole('orchestrator')?.model || 'unknown',
    });

    // Add synthesis as final response
    responses.push({
      role: 'orchestrator',
      model: this.orchestrator.getAgentForRole('orchestrator')?.model || 'unknown',
      provider: this.orchestrator.getAgentForRole('orchestrator')?.provider || 'unknown',
      content: synthesis,
      timestamp: Date.now(),
    });

    return responses;
  }

  private getDefaultSystemPrompt(role: string): string {
    const prompts: Record<string, string> = {
      coder: 'You are a senior software engineer. Write clean, maintainable code. Follow best practices and patterns.',
      researcher: 'You are a research analyst. Gather information, analyze data, and provide well-sourced insights.',
      reviewer: 'You are a code reviewer. Check for bugs, security issues, and suggest improvements.',
      designer: 'You are a UI/UX designer. Focus on user experience, accessibility, and visual design.',
      analyst: 'You are a data analyst. Analyze patterns, metrics, and provide actionable insights.',
      orchestrator: 'You are the orchestrator. Coordinate the team and synthesize the final answer.',
      all: 'You are a helpful assistant. Provide comprehensive, accurate responses.',
    };
    return prompts[role] || prompts.all;
  }
}