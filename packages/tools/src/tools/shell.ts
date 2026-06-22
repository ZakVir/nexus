// Tool: shell — execute a shell command

import { execSync } from 'child_process';
import type { Tool } from '../types.js';

export const shellTool: Tool = {
  definition: {
    name: 'shell',
    description: 'Execute a shell command and return its output. Use for running builds, tests, git commands, and other shell operations.',
    category: 'system',
    sideEffect: true,
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command (default: current directory)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['command'],
    },
  },

  async execute(input) {
    const command = input.command as string;
    const cwd = (input.cwd as string) || process.cwd();
    const timeout = (input.timeout as number) || 30000;

    try {
      const output = execSync(command, {
        cwd,
        timeout,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024, // 1MB
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return { 
        output: output.trim(),
        metadata: { command, cwd, exitCode: 0 } 
      };
    } catch (err: any) {
      const stdout = err.stdout?.toString() || '';
      const stderr = err.stderr?.toString() || '';
      const exitCode = err.status || 1;
      
      return { 
        output: stdout.trim() || stderr.trim(),
        error: stderr.trim() || `Command failed with exit code ${exitCode}`,
        metadata: { command, cwd, exitCode } 
      };
    }
  },
};
