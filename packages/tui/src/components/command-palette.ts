// Command palette — fuzzy searchable list of all commands with keybinds

import { ansi, visibleWidth, truncate } from '../utils/ansi.js';
import type { Theme } from '../theme/index.js';
import { defaultTheme } from '../theme/index.js';

export interface Command {
  name: string;
  keybind?: string;
  category: string;
  action: () => void;
}

const DEFAULT_COMMANDS: Omit<Command, 'action'>[] = [
  // Session
  { name: 'New Session', keybind: 'Ctrl+X n', category: 'Session' },
  { name: 'Session List', keybind: 'Ctrl+X l', category: 'Session' },
  { name: 'Rename Session', keybind: 'Ctrl+R', category: 'Session' },
  { name: 'Fork Session', category: 'Session' },
  { name: 'Compact Session', keybind: 'Ctrl+X c', category: 'Session' },
  { name: 'Export Session', category: 'Session' },
  { name: 'Share Session', category: 'Session' },
  { name: 'Timeline', category: 'Session' },
  // Model
  { name: 'Cycle Model', keybind: 'Ctrl+M', category: 'Model' },
  { name: 'Configure Models', category: 'Model' },
  // Mode
  { name: 'Single Model', category: 'Mode' },
  { name: 'Multi-Model', category: 'Mode' },
  { name: 'Full Conversational', category: 'Mode' },
  // Navigation
  { name: 'Toggle Sidebar', keybind: 'Ctrl+X b', category: 'Navigation' },
  { name: 'Theme Picker', keybind: 'Ctrl+X t', category: 'Navigation' },
  { name: 'Status', keybind: 'Ctrl+X s', category: 'Navigation' },
  { name: 'Jump to Message', keybind: 'Ctrl+X g', category: 'Navigation' },
  // System
  { name: 'Help', keybind: '?', category: 'System' },
  { name: 'Setup', category: 'System' },
  { name: 'Quit', keybind: 'Ctrl+C', category: 'System' },
];

/**
 * Render the command palette overlay.
 * Returns the selected command name or null if cancelled.
 */
export async function renderCommandPalette(
  theme: Theme = defaultTheme
): Promise<Command | null> {
  const c = theme.colors;
  const termWidth = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  
  let query = '';
  let cursorIndex = 0;
  let done = false;
  let result: Command | null = null;
  
  // Filter commands based on query
  function getFilteredCommands(): typeof DEFAULT_COMMANDS {
    if (!query) return DEFAULT_COMMANDS;
    const lowerQuery = query.toLowerCase();
    return DEFAULT_COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    );
  }

  function render() {
    const filtered = getFilteredCommands();
    const maxVisible = Math.min(filtered.length, termHeight - 6);
    
    const out: string[] = [];
    out.push(ansi.altScreen);
    out.push(ansi.clearScreen);
    out.push(ansi.moveTo(0, 0));
    out.push(ansi.hideCursor);
    
    // Search input
    out.push(ansi.fgHex(c.primary));
    out.push(`  🔍 ${query}`);
    out.push(ansi.fgHex(c.textSubtle) + '█' + ansi.reset);
    out.push('\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi.reset);
    out.push('\n');
    
    // Commands grouped by category
    let currentCategory = '';
    let itemIndex = 0;
    
    for (const cmd of filtered.slice(0, maxVisible)) {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        out.push(ansi.fgHex(c.textMuted) + ansi.bold + `  ${currentCategory}` + ansi.reset + '\n');
      }
      
      const isActive = itemIndex === cursorIndex;
      
      if (isActive) {
        out.push(ansi.fgHex(c.primary) + '  → ' + ansi.reset);
      } else {
        out.push('    ');
      }
      
      // Command name
      out.push(ansi.fgHex(isActive ? c.primary : c.text) + cmd.name + ansi.reset);
      
      // Keybind on the right
      if (cmd.keybind) {
        const nameWidth = visibleWidth(cmd.name);
        const keybindPad = Math.max(0, 40 - nameWidth);
        out.push(' '.repeat(keybindPad) + ansi.fgHex(c.textMuted) + cmd.keybind + ansi.reset);
      }
      
      out.push('\n');
      itemIndex++;
    }
    
    // Footer
    out.push('\n');
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi.reset);
    out.push('\n');
    out.push(ansi.fgHex(c.textMuted));
    out.push('  ↑↓ navigate  ·  enter select  ·  esc cancel');
    out.push(ansi.reset);
    
    process.stdout.write(out.join(''));
  }

  return new Promise<Command | null>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      if (done) return;
      
      const filtered = getFilteredCommands();
      
      switch (data) {
        case '\x1b[A': // Up
          cursorIndex = (cursorIndex - 1 + filtered.length) % filtered.length;
          render();
          break;
        case '\x1b[B': // Down
          cursorIndex = (cursorIndex + 1) % filtered.length;
          render();
          break;
        case '\r': // Enter
          if (filtered[cursorIndex]) {
            done = true;
            result = filtered[cursorIndex] as Command;
            cleanup();
            resolve(result);
          }
          break;
        case '\x1b': // Escape
        case '\x03': // Ctrl+C
          done = true;
          result = null;
          cleanup();
          resolve(null);
          break;
        case '\x7f': // Backspace
          query = query.slice(0, -1);
          cursorIndex = 0;
          render();
          break;
        default:
          if (data.length === 1 && data.charCodeAt(0) >= 32) {
            query += data;
            cursorIndex = 0;
            render();
          }
          break;
      }
    };

    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi.showCursor);
      process.stdout.write(ansi.normalScreen);
    }

    process.stdin.on('data', onData);
    render();
  });
}