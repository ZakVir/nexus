// Tool: group_discuss — broadcast a prompt to all models in conversational mode

import type { Tool } from '../types.js';

export const groupDiscussTool: Tool = {
  definition: {
    name: 'group_discuss',
    description: 'Broadcast a prompt to all configured models for a group discussion. Each model responds independently, then an orchestrator synthesizes the results.',
    category: 'multi-model',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The topic/question for the group to discuss',
        },
        models: {
          type: 'array',
          description: 'Specific model IDs to include (optional, defaults to all configured models)',
          items: { type: 'string' },
        },
        focus: {
          type: 'string',
          description: 'Optional focus area to guide the discussion',
        },
      },
      required: ['prompt'],
    },
  },

  async execute(input) {
    const prompt = input.prompt as string;
    const models = input.models as string[] | undefined;
    const focus = input.focus as string | undefined;

    // Placeholder — real implementation would:
    // 1. Send prompt to all models in parallel
    // 2. Collect responses
    // 3. Have orchestrator synthesize
    const modelCount = models?.length || 'all configured';
    
    return { 
      output: `[group_discuss] ${modelCount} models discussing:\n\n${prompt}${focus ? `\n\nFocus: ${focus}` : ''}`,
      metadata: { 
        prompt, 
        models,
        focus,
        modelCount: typeof modelCount === 'number' ? modelCount : 0,
      } 
    };
  },
};
