// Conversational agent — models discuss together, orchestrator synthesizes

import type { AgentMessage } from './types.js';
import type { CompleteFn } from './engine.js';

export interface ConversationalAgentOptions {
  models: Array<{
    id: string;
    provider: string;
    systemPrompt?: string;
  }>;
  orchestratorModel: string;
  orchestratorProvider: string;
  complete: CompleteFn;
}

export class ConversationalAgent {
  private models: ConversationalAgentOptions['models'];
  private orchestratorModel: string;
  private orchestratorProvider: string;
  private complete: CompleteFn;

  constructor(options: ConversationalAgentOptions) {
    this.models = options.models;
    this.orchestratorModel = options.orchestratorModel;
    this.orchestratorProvider = options.orchestratorProvider;
    this.complete = options.complete;
  }

  /**
   * Run a full conversational session.
   * All models respond independently, then orchestrator synthesizes.
   */
  async run(prompt: string): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];

    // Step 1: All models respond in parallel
    const modelPromises = this.models.map(async (model) => {
      const systemPrompt = model.systemPrompt || this.getDefaultSystemPrompt(model.id);
      const userPrompt = `The user asked: ${prompt}\n\nPlease give your independent analysis. Do not repeat what others have said — your response will be merged.`;

      try {
        const content = await this.complete({
          prompt: userPrompt,
          model: model.id,
          provider: model.provider,
          system: systemPrompt,
        });
        return {
          role: 'analyst' as const,
          model: model.id,
          provider: model.provider,
          content,
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          role: 'analyst' as const,
          model: model.id,
          provider: model.provider,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        };
      }
    });

    const modelResponses = await Promise.all(modelPromises);
    for (const response of modelResponses) {
      if (response) responses.push(response);
    }

    // Step 2: Orchestrator synthesizes
    {
      const synthesisPrompt = this.buildSynthesisPrompt(prompt, responses);
      try {
        const synthesis = await this.complete({
          prompt: synthesisPrompt,
          model: this.orchestratorModel,
          provider: this.orchestratorProvider,
        });
        responses.push({
          role: 'orchestrator',
          model: this.orchestratorModel,
          provider: this.orchestratorProvider,
          content: synthesis,
          timestamp: Date.now(),
        });
      } catch (error) {
        responses.push({
          role: 'orchestrator',
          model: this.orchestratorModel,
          provider: this.orchestratorProvider,
          content: `Synthesis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    return responses;
  }

  private buildSynthesisPrompt(originalPrompt: string, responses: AgentMessage[]): string {
    const parts: string[] = [
      'You are the orchestrator in a multi-model discussion.',
      `The user asked: "${originalPrompt}"`,
      '',
      'Here are the independent responses from each model:',
      '',
    ];

    for (const response of responses) {
      const modelName = response.model.split('/').pop() || response.model;
      parts.push(`### ${modelName} (${response.provider})`);
      parts.push(response.content);
      parts.push('');
    }

    parts.push('Based on all responses, synthesize a single authoritative answer.');
    parts.push('Credit each model by name for their contributions.');
    parts.push('Produce a comprehensive, well-structured final answer.');

    return parts.join('\n');
  }

  private getDefaultSystemPrompt(modelId: string): string {
    return `You are a helpful AI assistant. Provide thoughtful, well-reasoned analysis. Be concise but thorough.`;
  }
}