// src/types.ts
class ToolRegistry {
  tools = new Map;
  register(tool) {
    this.tools.set(tool.definition.name, tool);
  }
  get(name) {
    return this.tools.get(name);
  }
  list() {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }
  async execute(name, input) {
    const tool = this.tools.get(name);
    if (!tool) {
      return { output: "", error: `Unknown tool: ${name}` };
    }
    try {
      return await tool.execute(input);
    } catch (err) {
      return { output: "", error: err instanceof Error ? err.message : String(err) };
    }
  }
  getMcpSchema() {
    return this.list();
  }
}
var toolRegistry = new ToolRegistry;

// src/tools/read.ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
var readTool = {
  definition: {
    name: "read",
    description: "Read the contents of a file from the filesystem. Returns the full file content as text.",
    category: "filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute or relative path to the file to read"
        },
        offset: {
          type: "number",
          description: "Line number to start reading from (1-indexed, default: 1)",
          default: 1
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read (default: 500)",
          default: 500
        }
      },
      required: ["path"]
    }
  },
  async execute(input) {
    const filePath = resolve(input.path);
    if (!existsSync(filePath)) {
      return { output: "", error: `File not found: ${filePath}` };
    }
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split(`
`);
      const offset = (input.offset || 1) - 1;
      const limit = input.limit || 500;
      const sliced = lines.slice(offset, offset + limit);
      const output = sliced.map((line, i) => `${offset + i + 1}|${line}`).join(`
`);
      return {
        output,
        metadata: {
          totalLines: lines.length,
          returnedLines: sliced.length,
          path: filePath
        }
      };
    } catch (err) {
      return { output: "", error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// src/tools/write.ts
import { writeFileSync, mkdirSync, existsSync as existsSync2 } from "fs";
import { resolve as resolve2, dirname } from "path";
var writeTool = {
  definition: {
    name: "write",
    description: "Write content to a file on the filesystem. Creates parent directories if needed. Overwrites existing files.",
    category: "filesystem",
    sideEffect: true,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute or relative path to the file to write"
        },
        content: {
          type: "string",
          description: "The content to write to the file"
        }
      },
      required: ["path", "content"]
    }
  },
  async execute(input) {
    const filePath = resolve2(input.path);
    const content = input.content;
    try {
      const dir = dirname(filePath);
      if (!existsSync2(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, content, "utf-8");
      return {
        output: `File written: ${filePath} (${content.length} bytes)`,
        metadata: { path: filePath, bytes: content.length }
      };
    } catch (err) {
      return { output: "", error: `Failed to write file: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// src/tools/edit.ts
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2, existsSync as existsSync3 } from "fs";
import { resolve as resolve3 } from "path";
var editTool = {
  definition: {
    name: "edit",
    description: "Replace an exact string in a file with new content. Use this for targeted edits instead of rewriting the entire file.",
    category: "filesystem",
    sideEffect: true,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute or relative path to the file to edit"
        },
        old_string: {
          type: "string",
          description: "The exact string to find and replace (must be unique in the file)"
        },
        new_string: {
          type: "string",
          description: "The replacement string"
        },
        replace_all: {
          type: "boolean",
          description: "Replace all occurrences instead of just the first (default: false)",
          default: false
        }
      },
      required: ["path", "old_string", "new_string"]
    }
  },
  async execute(input) {
    const filePath = resolve3(input.path);
    if (!existsSync3(filePath)) {
      return { output: "", error: `File not found: ${filePath}` };
    }
    try {
      const content = readFileSync2(filePath, "utf-8");
      const oldStr = input.old_string;
      const newStr = input.new_string;
      const replaceAll = input.replace_all || false;
      if (!content.includes(oldStr)) {
        return { output: "", error: `old_string not found in file: ${filePath}` };
      }
      let newContent;
      if (replaceAll) {
        newContent = content.split(oldStr).join(newStr);
      } else {
        const idx = content.indexOf(oldStr);
        newContent = content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
      }
      writeFileSync2(filePath, newContent, "utf-8");
      const count = replaceAll ? content.split(oldStr).length - 1 : 1;
      return {
        output: `Replaced ${count} occurrence(s) in ${filePath}`,
        metadata: { path: filePath, replacements: count }
      };
    } catch (err) {
      return { output: "", error: `Failed to edit file: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// src/tools/shell.ts
import { execSync } from "child_process";
var shellTool = {
  definition: {
    name: "shell",
    description: "Execute a shell command and return its output. Use for running builds, tests, git commands, and other shell operations.",
    category: "system",
    sideEffect: true,
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute"
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (default: current directory)"
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000)",
          default: 30000
        }
      },
      required: ["command"]
    }
  },
  async execute(input) {
    const command = input.command;
    const cwd = input.cwd || process.cwd();
    const timeout = input.timeout || 30000;
    try {
      const output = execSync(command, {
        cwd,
        timeout,
        encoding: "utf-8",
        maxBuffer: 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"]
      });
      return {
        output: output.trim(),
        metadata: { command, cwd, exitCode: 0 }
      };
    } catch (err) {
      const stdout = err.stdout?.toString() || "";
      const stderr = err.stderr?.toString() || "";
      const exitCode = err.status || 1;
      return {
        output: stdout.trim() || stderr.trim(),
        error: stderr.trim() || `Command failed with exit code ${exitCode}`,
        metadata: { command, cwd, exitCode }
      };
    }
  }
};

// src/tools/glob.ts
import { execSync as execSync2 } from "child_process";
var globTool = {
  definition: {
    name: "glob",
    description: "Find files matching a glob pattern. Returns matching file paths sorted by modification time.",
    category: "filesystem",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: 'Glob pattern to match (e.g., "**/*.ts", "src/**/*.tsx")'
        },
        path: {
          type: "string",
          description: "Directory to search in (default: current directory)"
        }
      },
      required: ["pattern"]
    }
  },
  async execute(input) {
    const pattern = input.pattern;
    const cwd = input.path || process.cwd();
    try {
      const output = execSync2(`find . -name "${pattern}" -type f | head -100`, {
        cwd,
        encoding: "utf-8",
        timeout: 1e4
      });
      const files = output.trim().split(`
`).filter((f) => f);
      return {
        output: files.join(`
`),
        metadata: { count: files.length, pattern, path: cwd }
      };
    } catch (err) {
      return { output: "", error: `Glob search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// src/tools/grep.ts
import { execSync as execSync3 } from "child_process";
var grepTool = {
  definition: {
    name: "grep",
    description: "Search for a pattern inside files. Returns matching lines with file paths and line numbers.",
    category: "filesystem",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Regex pattern to search for"
        },
        path: {
          type: "string",
          description: "Directory or file to search in (default: current directory)"
        },
        file_glob: {
          type: "string",
          description: 'Filter by file extension (e.g., "*.ts", "*.py")'
        },
        case_insensitive: {
          type: "boolean",
          description: "Make the search case-insensitive (default: false)",
          default: false
        }
      },
      required: ["pattern"]
    }
  },
  async execute(input) {
    const pattern = input.pattern;
    const searchPath = input.path || ".";
    const fileGlob = input.file_glob;
    const caseInsensitive = input.case_insensitive || false;
    try {
      const flags = caseInsensitive ? "-rni" : "-rn";
      const fileFilter = fileGlob ? `--include="${fileGlob}"` : "";
      const cmd = `grep ${flags} ${fileFilter} "${pattern}" ${searchPath} | head -50`;
      const output = execSync3(cmd, {
        encoding: "utf-8",
        timeout: 1e4
      });
      return {
        output: output.trim(),
        metadata: { pattern, path: searchPath, fileGlob }
      };
    } catch (err) {
      if (err.status === 1) {
        return { output: "No matches found", metadata: { pattern, path: searchPath } };
      }
      return { output: "", error: `Grep failed: ${err.message}` };
    }
  }
};

// src/tools/web_fetch.ts
var webFetchTool = {
  definition: {
    name: "web_fetch",
    description: "Fetch the content of a web page or API endpoint. Returns the response body as text.",
    category: "web",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch"
        },
        method: {
          type: "string",
          description: "HTTP method (default: GET)",
          enum: ["GET", "POST", "PUT", "DELETE"],
          default: "GET"
        },
        headers: {
          type: "object",
          description: "Optional HTTP headers as key-value pairs"
        },
        body: {
          type: "string",
          description: "Request body for POST/PUT requests"
        }
      },
      required: ["url"]
    }
  },
  async execute(input) {
    const url = input.url;
    const method = input.method || "GET";
    const headers = input.headers || {};
    const body = input.body;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "User-Agent": "Nexus/0.1.0",
          ...headers
        },
        body: method !== "GET" ? body : undefined,
        signal: AbortSignal.timeout(30000)
      });
      const text = await response.text();
      return {
        output: text.slice(0, 1e4),
        metadata: {
          url,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get("content-type"),
          truncated: text.length > 1e4
        }
      };
    } catch (err) {
      return { output: "", error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};

// src/tools/web_search.ts
var webSearchTool = {
  definition: {
    name: "web_search",
    description: "Search the web using a search engine. Returns relevant results with titles, URLs, and snippets.",
    category: "web",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 5)",
          default: 5
        }
      },
      required: ["query"]
    }
  },
  async execute(input) {
    const query = input.query;
    const limit = input.limit || 5;
    const results = [
      { title: `Search result for: ${query}`, url: "https://example.com", snippet: "This is a placeholder result." }
    ];
    return {
      output: results.map((r) => `${r.title}
${r.url}
${r.snippet}`).join(`

`),
      metadata: { query, resultCount: results.length }
    };
  }
};

// src/tools/todo_write.ts
var todos = [];
var todoWriteTool = {
  definition: {
    name: "todo_write",
    description: "Create, update, or read a todo list for tracking task progress during a session.",
    category: "utility",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action to perform",
          enum: ["read", "write", "update"]
        },
        todos: {
          type: "array",
          description: "Array of todo items (for write action)",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique identifier" },
              content: { type: "string", description: "Task description" },
              status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] }
            },
            required: ["id", "content", "status"]
          }
        },
        id: {
          type: "string",
          description: "Todo item ID (for update action)"
        },
        status: {
          type: "string",
          description: "New status (for update action)",
          enum: ["pending", "in_progress", "completed", "cancelled"]
        }
      },
      required: ["action"]
    }
  },
  async execute(input) {
    const action = input.action;
    switch (action) {
      case "read":
        return {
          output: formatTodos(todos),
          metadata: { count: todos.length }
        };
      case "write":
        todos = input.todos || [];
        return {
          output: `Todo list updated with ${todos.length} items`,
          metadata: { count: todos.length }
        };
      case "update": {
        const id = input.id;
        const status = input.status;
        const todo = todos.find((t) => t.id === id);
        if (todo) {
          todo.status = status;
          return { output: `Todo "${id}" updated to ${status}` };
        }
        return { output: "", error: `Todo not found: ${id}` };
      }
      default:
        return { output: "", error: `Unknown action: ${action}` };
    }
  }
};
function formatTodos(todos2) {
  if (todos2.length === 0)
    return "No todos.";
  return todos2.map((t) => {
    const icon = { pending: "○", in_progress: "◐", completed: "●", cancelled: "✕" }[t.status];
    return `[${icon}] ${t.id}: ${t.content}`;
  }).join(`
`);
}

// src/tools/model_route.ts
var modelRouteTool = {
  definition: {
    name: "model_route",
    description: "Route a sub-task to a specific AI model by ID or role. Use this to delegate specialized work to the best model for the job.",
    category: "multi-model",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt/task to send to the target model"
        },
        model: {
          type: "string",
          description: 'Model ID to route to (e.g., "deepseek/deepseek-v4-flash")'
        },
        role: {
          type: "string",
          description: "Agent role to use instead of a specific model",
          enum: ["coder", "researcher", "reviewer", "designer", "analyst"]
        },
        context: {
          type: "string",
          description: "Additional context to include with the prompt"
        }
      },
      required: ["prompt"]
    }
  },
  async execute(input) {
    const prompt = input.prompt;
    const model = input.model;
    const role = input.role;
    const context = input.context;
    if (!model && !role) {
      return { output: "", error: "Either model or role must be specified" };
    }
    const target = model || role;
    return {
      output: `[model_route] Routed to ${target}:

${prompt}`,
      metadata: {
        target,
        model,
        role,
        promptLength: prompt.length
      }
    };
  }
};

// src/tools/group_discuss.ts
var groupDiscussTool = {
  definition: {
    name: "group_discuss",
    description: "Broadcast a prompt to all configured models for a group discussion. Each model responds independently, then an orchestrator synthesizes the results.",
    category: "multi-model",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The topic/question for the group to discuss"
        },
        models: {
          type: "array",
          description: "Specific model IDs to include (optional, defaults to all configured models)",
          items: { type: "string" }
        },
        focus: {
          type: "string",
          description: "Optional focus area to guide the discussion"
        }
      },
      required: ["prompt"]
    }
  },
  async execute(input) {
    const prompt = input.prompt;
    const models = input.models;
    const focus = input.focus;
    const modelCount = models?.length || "all configured";
    return {
      output: `[group_discuss] ${modelCount} models discussing:

${prompt}${focus ? `

Focus: ${focus}` : ""}`,
      metadata: {
        prompt,
        models,
        focus,
        modelCount: typeof modelCount === "number" ? modelCount : 0
      }
    };
  }
};

// src/index.ts
toolRegistry.register(readTool);
toolRegistry.register(writeTool);
toolRegistry.register(editTool);
toolRegistry.register(shellTool);
toolRegistry.register(globTool);
toolRegistry.register(grepTool);
toolRegistry.register(webFetchTool);
toolRegistry.register(webSearchTool);
toolRegistry.register(todoWriteTool);
toolRegistry.register(modelRouteTool);
toolRegistry.register(groupDiscussTool);
export {
  writeTool,
  webSearchTool,
  webFetchTool,
  toolRegistry,
  todoWriteTool,
  shellTool,
  readTool,
  modelRouteTool,
  groupDiscussTool,
  grepTool,
  globTool,
  editTool
};
