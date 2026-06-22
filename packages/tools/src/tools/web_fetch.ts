// Tool: web_fetch — fetch URL contents

import type { Tool } from '../types.js';

export const webFetchTool: Tool = {
  definition: {
    name: 'web_fetch',
    description: 'Fetch the content of a web page or API endpoint. Returns the response body as text.',
    category: 'web',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch',
        },
        method: {
          type: 'string',
          description: 'HTTP method (default: GET)',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'GET',
        },
        headers: {
          type: 'object',
          description: 'Optional HTTP headers as key-value pairs',
        },
        body: {
          type: 'string',
          description: 'Request body for POST/PUT requests',
        },
      },
      required: ['url'],
    },
  },

  async execute(input) {
    const url = input.url as string;
    const method = (input.method as string) || 'GET';
    const headers = (input.headers as Record<string, string>) || {};
    const body = input.body as string | undefined;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'Nexus/0.1.0',
          ...headers,
        },
        body: method !== 'GET' ? body : undefined,
        signal: AbortSignal.timeout(30000),
      });

      const text = await response.text();
      
      return { 
        output: text.slice(0, 10000), // Limit output
        metadata: { 
          url, 
          status: response.status, 
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          truncated: text.length > 10000,
        } 
      };
    } catch (err) {
      return { output: '', error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
