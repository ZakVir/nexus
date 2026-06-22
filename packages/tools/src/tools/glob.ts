// Tool: glob — find files by pattern

import { execSync } from 'child_process';
import type { Tool } from '../types.js';

export const globTool: Tool = {
  definition: {
    name: 'glob',
    description: 'Find files matching a glob pattern. Returns matching file paths sorted by modification time.',
    category: 'filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match (e.g., "**/*.ts", "src/**/*.tsx")',
        },
        path: {
          type: 'string',
          description: 'Directory to search in (default: current directory)',
        },
      },
      required: ['pattern'],
    },
  },

  async execute(input) {
    const pattern = input.pattern as string;
    const cwd = (input.path as string) || process.cwd();

    try {
      const output = execSync(`find . -name "${pattern}" -type f | head -100`, {
        cwd,
        encoding: 'utf-8',
        timeout: 10000,
      });

      const files = output.trim().split('\n').filter(f => f);
      
      return { 
        output: files.join('\n'),
        metadata: { count: files.length, pattern, path: cwd } 
      };
    } catch (err) {
      return { output: '', error: `Glob search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
