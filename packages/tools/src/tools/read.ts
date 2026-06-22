// Tool: read — read file contents

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { Tool } from '../types.js';

export const readTool: Tool = {
  definition: {
    name: 'read',
    description: 'Read the contents of a file from the filesystem. Returns the full file content as text.',
    category: 'filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file to read',
        },
        offset: {
          type: 'number',
          description: 'Line number to start reading from (1-indexed, default: 1)',
          default: 1,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of lines to read (default: 500)',
          default: 500,
        },
      },
      required: ['path'],
    },
  },

  async execute(input) {
    const filePath = resolve(input.path as string);
    
    if (!existsSync(filePath)) {
      return { output: '', error: `File not found: ${filePath}` };
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const offset = ((input.offset as number) || 1) - 1;
      const limit = (input.limit as number) || 500;
      
      const sliced = lines.slice(offset, offset + limit);
      const output = sliced.map((line, i) => `${offset + i + 1}|${line}`).join('\n');
      
      return { 
        output, 
        metadata: { 
          totalLines: lines.length, 
          returnedLines: sliced.length,
          path: filePath,
        } 
      };
    } catch (err) {
      return { output: '', error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
