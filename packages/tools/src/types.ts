// Tool types and schemas

export interface ToolParameter {
  type: string;
  description?: string;
  // `boolean` for a leaf flag; `string[]` for a nested object schema's required keys.
  required?: boolean | string[];
  enum?: string[];
  default?: unknown;
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  /** Whether this tool modifies state (for safety gating) */
  sideEffect?: boolean;
  /** Category for grouping in UI */
  category?: string;
}

export interface ToolResult {
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  definition: ToolDefinition;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}

/** Tool registry — holds all available tools */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async execute(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { output: '', error: `Unknown tool: ${name}` };
    }
    try {
      return await tool.execute(input);
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Get JSON schema for all tools (for MCP clients) */
  getMcpSchema(): ToolDefinition[] {
    return this.list();
  }
}

export const toolRegistry = new ToolRegistry();
