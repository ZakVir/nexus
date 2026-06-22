// Tool: grep — search file contents

import { execSync } from 'child_process';
import type { Tool } from '../types.js';

export const grepTool: Tool = {
  definition: {
    name: 'grep',
    description: 'Search for a pattern inside files. Returns matching lines with file paths and line numbers.',
    category: 'filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for',
        },
        path: {
          type: 'string',
          description: 'Directory or file to search in (default: current directory)',
        },
        file_glob: {
          type: 'string',
          description: 'Filter by file extension (e.g., "*.ts", "*.py")',
        },
        case_insensitive: {
          type: 'boolean',
          description: 'Make the search case-insensitive (default: false)',
          default: false,
        },
      },
      required: ['pattern'],
    },
  },

  async execute(input) {
    const pattern = input.pattern as string;
    const searchPath = (input.path as string) || '.';
    const fileGlob = input.file_glob as string | undefined;
    const caseInsensitive = input.case_insensitive as boolean || false;

    try {
      const flags = caseInsensitive ? '-rni' : '-rn';
      const fileFilter = fileGlob ? `--include="${fileGlob}"` : '';
      const cmd = `grep ${flags} ${fileFilter} "${pattern}" ${searchPath} | head -50`;
      
      const output = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 10000,
      });

      return { 
        output: output.trim(),
        metadata: { pattern, path: searchPath, fileGlob } 
      };
    } catch (err: any) {
      if (err.status === 1) {
        return { output: 'No matches found', metadata: { pattern, path: searchPath } };
      }
      return { output: '', error: `Grep failed: ${err.message}` };
    }
  },
};
