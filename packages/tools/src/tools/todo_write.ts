// Tool: todo_write — maintain a todo list

import type { Tool } from '../types.js';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// In-memory todo store (per session)
let todos: TodoItem[] = [];

export const todoWriteTool: Tool = {
  definition: {
    name: 'todo_write',
    description: 'Create, update, or read a todo list for tracking task progress during a session.',
    category: 'utility',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform',
          enum: ['read', 'write', 'update'],
        },
        todos: {
          type: 'array',
          description: 'Array of todo items (for write action)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique identifier' },
              content: { type: 'string', description: 'Task description' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            },
            required: ['id', 'content', 'status'],
          },
        },
        id: {
          type: 'string',
          description: 'Todo item ID (for update action)',
        },
        status: {
          type: 'string',
          description: 'New status (for update action)',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        },
      },
      required: ['action'],
    },
  },

  async execute(input) {
    const action = input.action as string;

    switch (action) {
      case 'read':
        return { 
          output: formatTodos(todos),
          metadata: { count: todos.length } 
        };

      case 'write':
        todos = (input.todos as TodoItem[]) || [];
        return { 
          output: `Todo list updated with ${todos.length} items`,
          metadata: { count: todos.length } 
        };

      case 'update': {
        const id = input.id as string;
        const status = input.status as string;
        const todo = todos.find(t => t.id === id);
        if (todo) {
          todo.status = status as TodoItem['status'];
          return { output: `Todo "${id}" updated to ${status}` };
        }
        return { output: '', error: `Todo not found: ${id}` };
      }

      default:
        return { output: '', error: `Unknown action: ${action}` };
    }
  },
};

function formatTodos(todos: TodoItem[]): string {
  if (todos.length === 0) return 'No todos.';
  
  return todos.map(t => {
    const icon = { pending: '○', in_progress: '◐', completed: '●', cancelled: '✕' }[t.status];
    return `[${icon}] ${t.id}: ${t.content}`;
  }).join('\n');
}
