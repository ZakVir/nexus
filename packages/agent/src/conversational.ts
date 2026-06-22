// Conversational agent — models discuss together, orchestrator synthesizes

import type { AgentMessage } from './types.js';

export interface ConversationalAgentOptions {
  models: Array<{
    id: string;
    provider: string;
    systemPrompt?: string;
  }>;
  orchestratorModel: string;
  orchestratorProvider: string;
  providers: Map<string, { complete: (prompt: string, options?: any) => Promise<string> }>;
}

export class ConversationalAgent {
  private models: ConversationalAgentOptions['models'];
  private orchestratorModel: string;
  private orchestratorProvider: string;
  private providers: ConversationalAgentOptions['providers'];

  constructor(options: ConversationalAgentOptions) {
    this.models = options.models;
    this.orchestratorModel = options.orchestratorModel;
    this.orchestratorProvider = options.orchestratorProvider;
    this.providers = options.providers;
  }

  /**
   * Run a full conversational session.
   * All models respond independently, then orchestrator synthesizes.
   */
  async run(prompt: string): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];

    // Step 1: All models respond in parallel
    const modelPromises = this.models.map(async (model) => {
      const provider = this.providers.get(model.provider);
      if (!provider) return null;

      const systemPrompt = model.systemPrompt || this.getDefaultSystemPrompt(model.id);
      const fullPrompt = `${systemPrompt}\n\nThe user asked: ${prompt}\n\nPlease give your independent analysis. Do not repeat what others have said — your response will be merged.`;

      try {
        const content = await provider.complete(fullPrompt, { model: model.id });
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
    const orchestratorProvider = this.providers.get(this.orchestratorProvider);
    if (orchestratorProvider) {
      const synthesisPrompt = this.buildSynthesisPrompt(prompt, responses);
      try {
        const synthesis = await orchestratorProvider.complete(synthesisPrompt, { model: this.orchestratorModel });
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