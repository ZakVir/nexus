// Tool: edit — make targeted edits to a file

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { Tool } from '../types.js';

export const editTool: Tool = {
  definition: {
    name: 'edit',
    description: 'Replace an exact string in a file with new content. Use this for targeted edits instead of rewriting the entire file.',
    category: 'filesystem',
    sideEffect: true,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file to edit',
        },
        old_string: {
          type: 'string',
          description: 'The exact string to find and replace (must be unique in the file)',
        },
        new_string: {
          type: 'string',
          description: 'The replacement string',
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace all occurrences instead of just the first (default: false)',
          default: false,
        },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },

  async execute(input) {
    const filePath = resolve(input.path as string);
    
    if (!existsSync(filePath)) {
      return { output: '', error: `File not found: ${filePath}` };
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const oldStr = input.old_string as string;
      const newStr = input.new_string as string;
      const replaceAll = input.replace_all as boolean || false;

      if (!content.includes(oldStr)) {
        return { output: '', error: `old_string not found in file: ${filePath}` };
      }

      let newContent: string;
      if (replaceAll) {
        newContent = content.split(oldStr).join(newStr);
      } else {
        const idx = content.indexOf(oldStr);
        newContent = content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
      }

      writeFileSync(filePath, newContent, 'utf-8');

      const count = replaceAll ? content.split(oldStr).length - 1 : 1;
      return { 
        output: `Replaced ${count} occurrence(s) in ${filePath}`,
        metadata: { path: filePath, replacements: count } 
      };
    } catch (err) {
      return { output: '', error: `Failed to edit file: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
