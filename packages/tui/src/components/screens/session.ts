// Session screen — message list + sidebar + prompt bar

import { ansi, visibleWidth, truncate } from '../../utils/ansi.js';
import type { Theme } from '../../theme/index.js';
import { defaultTheme } from '../../theme/index.js';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
  model?: string;
  durationMs?: number;
  thinking?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  type: 'inline' | 'block';
  icon: string;
  name: string;
  input?: string;
  output?: string;
}

export interface SidebarProps {
  title: string;
  mode: string;
  model: string;
  modelAlias?: string;
  files?: string[];
  mcpCount?: number;
  lspLanguages?: string[];
  version?: string;
}

export interface SessionScreenProps {
  messages: Message[];
  sidebar: SidebarProps;
  promptPlaceholder?: string;
  modeLabel?: string;
  cwd: string;
  modelCount: number;
  theme?: Theme;
}

/**
 * Render the session screen — main content area + sidebar + prompt bar + footer.
 */
export function renderSessionScreen(props: SessionScreenProps): string {
  const t = props.theme ?? defaultTheme;
  const c = t.colors;
  const out: string[] = [];
  const termWidth = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;

  const sidebarWidth = 42;
  const showSidebar = termWidth > 120;
  const mainWidth = showSidebar ? termWidth - sidebarWidth - 1 : termWidth;
  const footerHeight = 3; // separator + content + prompt

  // ─── Sidebar ────────────────────────────────────────
  const sidebarLines = showSidebar ? renderSidebar(props.sidebar, sidebarWidth, t) : [];

  // ─── Main content ───────────────────────────────────
  const mainLines: string[] = [];
  
  // Messages
  for (const msg of props.messages) {
    mainLines.push(...renderMessage(msg, mainWidth, t));
    mainLines.push(''); // gap between messages
  }

  // ─── Compose final output ───────────────────────────
  const maxLines = termHeight - footerHeight;
  
  // Fill main content area
  for (let i = 0; i < maxLines; i++) {
    const mainLine = mainLines[i] || '';
    const sideLine = sidebarLines[i] || '';
    
    // Truncate main to fit
    const mainVis = visibleWidth(mainLine);
    const mainMax = showSidebar ? mainWidth - 2 : mainWidth;
    const truncatedMain = mainVis > mainMax ? truncate(mainLine, mainMax) : mainLine;
    const mainPad = Math.max(0, mainMax - visibleWidth(truncatedMain));
    
    if (showSidebar) {
      out.push(truncatedMain + ' '.repeat(mainPad) + ansi.fgHex(c.borderSubtle) + '│' + ansi.reset + sideLine + '\n');
    } else {
      out.push(truncatedMain + '\n');
    }
  }

  // ─── Footer ─────────────────────────────────────────
  out.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(termWidth) + ansi.reset + '\n');

  // Prompt bar
  const promptBarWidth = Math.max(75, Math.floor(termWidth * 0.7));
  const promptPad = Math.max(0, Math.floor((termWidth - promptBarWidth) / 2));
  const modeLabel = props.modeLabel || 'single';
  const promptText = `[${modeLabel} ▾]  Ask anything...    [ctrl+p]`;
  const promptTextPad = Math.max(0, Math.floor((promptBarWidth - 2 - promptText.length) / 2));
  
  out.push(' '.repeat(promptPad) + ansi.fgHex(c.borderActive) + '╭' + '─'.repeat(promptBarWidth - 2) + '╮' + ansi.reset + '\n');
  out.push(' '.repeat(promptPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset +
           ' '.repeat(promptTextPad) + ansi.fgHex(c.textMuted) + promptText + ansi.reset +
           ' '.repeat(Math.max(0, promptBarWidth - 2 - promptTextPad - promptText.length)) +
           ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');
  out.push(' '.repeat(promptPad) + ansi.fgHex(c.borderActive) + '╰' + '─'.repeat(promptBarWidth - 2) + '╯' + ansi.reset + '\n');

  // Bottom footer
  out.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(termWidth) + ansi.reset + '\n');
  const footerLeft = props.cwd;
  const footerRight = `[${modeLabel}] · ${props.model} · ${props.modelCount} model${props.modelCount !== 1 ? 's' : ''}`;
  const footerGap = termWidth - footerLeft.length - footerRight.length;
  out.push(ansi.fgHex(c.text) + footerLeft + ansi.reset +
           ' '.repeat(Math.max(1, footerGap)) +
           ansi.fgHex(c.textMuted) + footerRight + ansi.reset);

  return out.join('');
}

/**
 * Render a single message.
 */
function renderMessage(msg: Message, maxWidth: number, theme: Theme): string[] {
  const c = theme.colors;
  const lines: string[] = [];

  if (msg.role === 'user') {
    // User message: left border, backgroundPanel bg
    const border = ansi.fgHex(c.primary) + '│' + ansi.reset;
    const content = msg.content;
    
    // Word wrap the content
    const wrapped = wordWrap(content, maxWidth - 4);
    for (const line of wrapped) {
      lines.push(border + ' ' + ansi.fgHex(c.text) + line + ansi.reset);
    }
  } else if (msg.role === 'assistant') {
    // Assistant text: paddingLeft 3
    const wrapped = wordWrap(msg.content, maxWidth - 3);
    for (const line of wrapped) {
      lines.push('   ' + ansi.fgHex(c.text) + line + ansi.reset);
    }

    // Tool calls
    if (msg.toolCalls) {
      for (const tool of msg.toolCalls) {
        if (tool.type === 'inline') {
          lines.push('   ' + ansi.fgHex(c.info) + tool.icon + ' ' + ansi.fgHex(c.textMuted) + tool.name + ansi.reset);
        } else {
          // Block tool call with border
          lines.push(ansi.fgHex(c.border) + '│' + ansi.reset + ansi.fgHex(c.backgroundPanel) + ` # ${tool.name}` + ansi.reset);
          if (tool.output) {
            const outputLines = tool.output.split('\n').slice(0, 5);
            for (const ol of outputLines) {
              lines.push(ansi.fgHex(c.border) + '│' + ansi.reset + ' ' + ansi.fgHex(c.textMuted) + ol + ansi.reset);
            }
          }
        }
      }
    }

    // Session footer
    if (msg.model) {
      const footerText = `▣ ${msg.model}${msg.durationMs ? ` · ${(msg.durationMs / 1000).toFixed(1)}s` : ''}`;
      lines.push('   ' + ansi.fgHex(c.primary) + footerText + ansi.reset);
    }
  }

  return lines;
}

/**
 * Render the sidebar.
 */
function renderSidebar(sidebar: SidebarProps, width: number, theme: Theme): string[] {
  const c = theme.colors;
  const lines: string[] = [];
  const innerWidth = width - 4; // padding left/right

  // Title
  lines.push('  ' + ansi.fgHex(c.text) + sidebar.title + ansi.reset);
  lines.push('  ' + ansi.fgHex(c.borderSubtle) + '─'.repeat(innerWidth) + ansi.reset);
  lines.push('');

  // Mode
  lines.push('  ' + ansi.fgHex(c.textMuted) + 'Mode: ' + ansi.fgHex(c.text) + sidebar.mode + ansi.reset);
  
  // Model
  const modelDisplay = sidebar.modelAlias || truncate(sidebar.model, innerWidth - 8);
  lines.push('  ' + ansi.fgHex(c.textMuted) + 'Model: ' + ansi.fgHex(c.text) + modelDisplay + ansi.reset);
  lines.push('');

  // Separator
  lines.push('  ' + ansi.fgHex(c.borderSubtle) + '─'.repeat(innerWidth) + ansi.reset);
  lines.push('');

  // Files
  lines.push('  ' + ansi.fgHex(c.textMuted) + 'Files' + ansi.reset);
  if (sidebar.files) {
    for (const file of sidebar.files.slice(0, 5)) {
      const display = truncate(file, innerWidth - 4);
      lines.push('  ' + ansi.fgHex(c.text) + '• ' + display + ansi.reset);
    }
  }
  lines.push('');

  // Separator
  lines.push('  ' + ansi.fgHex(c.borderSubtle) + '─'.repeat(innerWidth) + ansi.reset);
  lines.push('');

  // MCP
  if (sidebar.mcpCount !== undefined) {
    lines.push('  ' + ansi.fgHex(c.textMuted) + 'MCP  ' + ansi.fgHex(c.info) + '⊙ ' + sidebar.mcpCount + ansi.reset);
  }
  
  // LSP
  if (sidebar.lspLanguages && sidebar.lspLanguages.length > 0) {
    lines.push('  ' + ansi.fgHex(c.textMuted) + 'LSP  • ' + ansi.fgHex(c.text) + sidebar.lspLanguages.join(', ') + ansi.reset);
  }
  lines.push('');

  // Separator
  lines.push('  ' + ansi.fgHex(c.borderSubtle) + '─'.repeat(innerWidth) + ansi.reset);
  lines.push('');

  // Version
  if (sidebar.version) {
    lines.push('  ' + ansi.fgHex(c.textMuted) + '• Nexus' + ansi.reset);
    lines.push('  ' + ansi.fgHex(c.textMuted) + '  v' + sidebar.version + ansi.reset);
  }

  return lines;
}

/**
 * Word wrap text to fit within a given width.
 */
function wordWrap(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const para of paragraphs) {
    if (para.length <= maxWidth) {
      lines.push(para);
      continue;
    }
    
    const words = para.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  
  return lines;
}