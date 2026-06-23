// MCP server mode — expose Nexus as an MCP server over stdio JSON-RPC.
// This is the transport MCP clients (Claude Code, OpenCode, etc.) use by default.

import { runText, makeCompleteFn, ConversationalAgent } from '@nexus-ai/agent';

export interface McpServerOptions {
  config: Record<string, any>;
  keys: Record<string, string>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServer {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  handle: (request: any) => Promise<any | undefined>;
}

export function createMcpServer(options: McpServerOptions): McpServer {
  const { config, keys } = options;

  const tools: McpTool[] = [
    {
      name: 'nexus_complete',
      description: 'Send a prompt to a Nexus model and get a response',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt to send' },
          model: { type: 'string', description: 'Model ID to use' },
          provider: { type: 'string', description: 'Provider to use' },
          max_tokens: { type: 'number', description: 'Max tokens in response' },
          temperature: { type: 'number', description: 'Temperature (0-1)' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'nexus_models',
      description: 'List configured Nexus models',
      inputSchema: {
        type: 'object',
        properties: { provider: { type: 'string', description: 'Filter by provider' } },
      },
    },
    {
      name: 'nexus_conversational',
      description: 'Run a prompt through multiple models with an orchestrator synthesis',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt to discuss' },
          models: { type: 'array', items: { type: 'string' }, description: 'Model IDs to include' },
          orchestrator: { type: 'string', description: 'Orchestrator model ID' },
          provider: { type: 'string', description: 'Provider for the models' },
        },
        required: ['prompt'],
      },
    },
  ];

  async function handleRequest(request: any): Promise<any | undefined> {
    const { method, params, id } = request;

    // Notifications carry no id and expect no response.
    if (id === undefined || id === null) return undefined;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'nexus', version: '0.1.0' },
          },
        };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools } };
      case 'tools/call':
        return await handleToolCall(params, id);
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  }

  async function handleToolCall(params: any, id: string | number): Promise<any> {
    const { name, arguments: args } = params || {};
    try {
      let result: any;
      switch (name) {
        case 'nexus_complete':
          result = await handleComplete(args);
          break;
        case 'nexus_models':
          result = handleListModels(args);
          break;
        case 'nexus_conversational':
          result = await handleConversational(args);
          break;
        default:
          return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } };
      }
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
          isError: true,
        },
      };
    }
  }

  async function handleComplete(args: any): Promise<any> {
    const res = await runText(config as any, keys, {
      prompt: args.prompt,
      model: args.model,
      provider: args.provider,
      maxTokens: args.max_tokens,
      temperature: args.temperature,
    });
    return { response: res.text, model: res.model, usage: res.usage };
  }

  function handleListModels(args: any): any {
    const models: Array<{ id: string; provider: string }> = [];
    const configured = (config.models || {}) as Record<string, string[]>;
    for (const [provider, ids] of Object.entries(configured)) {
      if (args?.provider && args.provider !== provider) continue;
      for (const id of ids) models.push({ id, provider });
    }
    return { models };
  }

  async function handleConversational(args: any): Promise<any> {
    const provider = args.provider || Object.keys(config.providers || {})[0] || 'openrouter';
    const modelIds: string[] = args.models && args.models.length
      ? args.models
      : Object.values((config.models || {}) as Record<string, string[]>).flat();
    const orchestrator = args.orchestrator || modelIds[modelIds.length - 1];

    const agent = new ConversationalAgent({
      models: modelIds.map((id: string) => ({ id, provider })),
      orchestratorModel: orchestrator,
      orchestratorProvider: provider,
      complete: makeCompleteFn(config as any, keys),
    });
    const responses = await agent.run(args.prompt);
    const synthesis = responses.find((r) => r.role === 'orchestrator');
    return {
      responses: responses
        .filter((r) => r.role !== 'orchestrator')
        .map((r) => ({ model: r.model, content: r.content })),
      synthesis: synthesis?.content ?? '',
    };
  }

  // ─── stdio JSON-RPC transport (newline-delimited) ───
  async function start(): Promise<void> {
    process.stderr.write('Nexus MCP server ready (stdio JSON-RPC)\n');
    let buffer = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        let request: any;
        try {
          request = JSON.parse(line);
        } catch {
          continue;
        }
        const response = await handleRequest(request);
        if (response !== undefined) process.stdout.write(JSON.stringify(response) + '\n');
      }
    });
    // Keep the process alive until stdin closes.
    await new Promise<void>((resolve) => process.stdin.on('end', resolve));
  }

  async function stop(): Promise<void> {
    process.stdin.pause();
  }

  return { start, stop, handle: handleRequest };
}
