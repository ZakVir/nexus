// Tools package — register all tools

import { toolRegistry } from './types.js';
import { readTool } from './tools/read.js';
import { writeTool } from './tools/write.js';
import { editTool } from './tools/edit.js';
import { shellTool } from './tools/shell.js';
import { globTool } from './tools/glob.js';
import { grepTool } from './tools/grep.js';
import { webFetchTool } from './tools/web_fetch.js';
import { webSearchTool } from './tools/web_search.js';
import { todoWriteTool } from './tools/todo_write.js';
import { modelRouteTool } from './tools/model_route.js';
import { groupDiscussTool } from './tools/group_discuss.js';

// Register all standard tools
toolRegistry.register(readTool);
toolRegistry.register(writeTool);
toolRegistry.register(editTool);
toolRegistry.register(shellTool);
toolRegistry.register(globTool);
toolRegistry.register(grepTool);
toolRegistry.register(webFetchTool);
toolRegistry.register(webSearchTool);
toolRegistry.register(todoWriteTool);

// Register Nexus-specific tools
toolRegistry.register(modelRouteTool);
toolRegistry.register(groupDiscussTool);

// Re-exports
export { toolRegistry } from './types.js';
export type { Tool, ToolDefinition, ToolResult, ToolParameter, ToolRegistry } from './types.js';
export { readTool } from './tools/read.js';
export { writeTool } from './tools/write.js';
export { editTool } from './tools/edit.js';
export { shellTool } from './tools/shell.js';
export { globTool } from './tools/glob.js';
export { grepTool } from './tools/grep.js';
export { webFetchTool } from './tools/web_fetch.js';
export { webSearchTool } from './tools/web_search.js';
export { todoWriteTool } from './tools/todo_write.js';
export { modelRouteTool } from './tools/model_route.js';
export { groupDiscussTool } from './tools/group_discuss.js';