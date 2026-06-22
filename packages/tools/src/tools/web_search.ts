// Tool: web_search — search the web

import type { Tool } from '../types.js';

export const webSearchTool: Tool = {
  definition: {
    name: 'web_search',
    description: 'Search the web using a search engine. Returns relevant results with titles, URLs, and snippets.',
    category: 'web',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },

  async execute(input) {
    const query = input.query as string;
    const limit = (input.limit as number) || 5;

    // Placeholder — real implementation would use a search API
    // Could use Google Custom Search, SerpAPI, or similar
    const results = [
      { title: `Search result for: ${query}`, url: 'https://example.com', snippet: 'This is a placeholder result.' },
    ];

    return { 
      output: results.map(r => `${r.title}\n${r.url}\n${r.snippet}`).join('\n\n'),
      metadata: { query, resultCount: results.length } 
    };
  },
};
