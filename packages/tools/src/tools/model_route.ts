// Tool: model_route — route a sub-task to a specific model

import type { Tool } from '../types.js';

export const modelRouteTool: Tool = {
  definition: {
    name: 'model_route',
    description: 'Route a sub-task to a specific AI model by ID or role. Use this to delegate specialized work to the best model for the job.',
    category: 'multi-model',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt/task to send to the target model',
        },
        model: {
          type: 'string',
          description: 'Model ID to route to (e.g., "deepseek/deepseek-v4-flash")',
        },
        role: {
          type: 'string',
          description: 'Agent role to use instead of a specific model',
          enum: ['coder', 'researcher', 'reviewer', 'designer', 'analyst'],
        },
        context: {
          type: 'string',
          description: 'Additional context to include with the prompt',
        },
      },
      required: ['prompt'],
      // Must have either model or role
    },
  },

  async execute(input) {
    const prompt = input.prompt as string;
    const model = input.model as string | undefined;
    const role = input.role as string | undefined;
    const context = input.context as string | undefined;

    if (!model && !role) {
      return { output: '', error: 'Either model or role must be specified' };
    }

    // Placeholder — real implementation would call the AI provider
    const target = model || role;
    
    return { 
      output: `[model_route] Routed to ${target}:\n\n${prompt}`,
      metadata: { 
        target, 
        model, 
        role,
        promptLength: prompt.length,
      } 
    };
  },
};
