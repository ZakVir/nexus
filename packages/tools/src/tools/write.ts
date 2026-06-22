// Tool: write — write content to a file

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import type { Tool } from '../types.js';

export const writeTool: Tool = {
  definition: {
    name: 'write',
    description: 'Write content to a file on the filesystem. Creates parent directories if needed. Overwrites existing files.',
    category: 'filesystem',
    sideEffect: true,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file to write',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },

  async execute(input) {
    const filePath = resolve(input.path as string);
    const content = input.content as string;

    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      writeFileSync(filePath, content, 'utf-8');
      
      return { 
        output: `File written: ${filePath} (${content.length} bytes)`,
        metadata: { path: filePath, bytes: content.length } 
      };
    } catch (err) {
      return { output: '', error: `Failed to write file: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
