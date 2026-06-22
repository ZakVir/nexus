// Provider selection component — exact Nexus setup format

import { ansi, visibleWidth, padOrTruncate, parseKey } from '../utils/ansi.js';
import { PROVIDER_DEFS, META_OPTIONS, type ProviderDef } from '../../../core/src/providers/definitions.js';
import type { Theme } from '../theme/index.js';
import { defaultTheme } from '../theme/index.js';

export interface ProviderSelectionResult {
  selectedProviders: string[];
  /** If user selected "Remove a saved custom provider" */
  removeCustom?: boolean;
  /** If user selected "Configure auxiliary models" */
  configureAux?: boolean;
  /** If user selected "Leave unchanged" */
  leaveUnchanged?: boolean;
}

/**
 * Renders the provider selection screen to stdout.
 * Returns a promise that resolves when user confirms (Enter).
 */
export async function renderProviderSelector(
  theme: Theme = defaultTheme,
  initialSelected: Set<string> = new Set(['nous-portal', 'openrouter', 'nvidia'])
): Promise<ProviderSelectionResult> {
  const c = theme.colors;
  let cursorIndex = 0;
  const selected = new Set(initialSelected);
  let done = false;
  let result: ProviderSelectionResult = { selectedProviders: [] };

  // All items: providers + meta options
  const allItems: Array<{ type: 'provider' | 'meta'; id: string; name: string; description: string; icon?: string; requiresKey?: boolean; hasArrow?: boolean }> = [
    ...PROVIDER_DEFS.map(p => ({
      type: 'provider' as const,
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      requiresKey: p.requiresKey,
      hasArrow: p.hasArrow,
    })),
    ...META_OPTIONS.map(m => ({
      type: 'meta' as const,
      id: m.id,
      name: m.name,
      description: '',
      icon: m.icon,
    })),
  ];

  const totalItems = allItems.length;
  // How many items fit in the visible area (we'll use rows 4 to termHeight-3)
  const termHeight = process.stdout.rows || 24;
  const termWidth = process.stdout.columns || 80;
  const maxVisible = Math.min(totalItems, termHeight - 6);
  let scrollOffset = 0;

  function render() {
    const out: string[] = [];
    
    // Clear screen + move to top
    out.push(ansi.altScreen);
    out.push(ansi.clearScreen);
    out.push(ansi.moveTo(0, 0));
    out.push(ansi.hideCursor);
    
    // Title
    out.push(ansi.fgHex(c.primary) + ansi.bold);
    out.push(`  Select provider:  `);
    out.push(ansi.reset);
    out.push(ansi.fgHex(c.textMuted));
    out.push(`↑↓ navigate  ENTER/SPACE select  ESC cancel`);
    out.push(ansi.reset);
    out.push('\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi.reset);
    out.push('\n');

    // Items
    for (let i = 0; i < maxVisible && i + scrollOffset < totalItems; i++) {
      const idx = i + scrollOffset;
      const item = allItems[idx];
      const isActive = idx === cursorIndex;
      const isSelectable = item.type === 'provider';
      const isChecked = isSelectable && selected.has(item.id);

      if (item.type === 'provider') {
        // Provider line
        let line = '  ';
        
        // Radio button
        if (isActive) {
          line += ansi.fgHex(c.primary) + '→ ' + ansi.reset;
        } else {
          line += '  ';
        }
        
        // Checkbox
        if (isChecked) {
          line += ansi.fgHex(c.success) + '(●) ' + ansi.reset;
        } else {
          line += ansi.fgHex(c.textMuted) + '(○) ' + ansi.reset;
        }
        
        // Name
        if (isActive) {
          line += ansi.fgHex(c.primary) + ansi.bold + item.name + ansi.reset;
        } else {
          line += ansi.fgHex(c.text) + item.name + ansi.reset;
        }
        
        // Arrow for multi-path providers
        if (item.hasArrow) {
          line += ansi.fgHex(c.textMuted) + ' ▸' + ansi.reset;
        }
        
        // Description
        line += ansi.fgHex(c.textMuted) + ` (${item.description})` + ansi.reset;
        
        out.push(line);
        out.push('\n');
      } else {
        // Meta option — no checkbox, just the option
        let line = '  ';
        
        if (isActive) {
          line += ansi.fgHex(c.primary) + '→ ' + ansi.reset;
        } else {
          line += '  ';
        }
        
        line += ansi.fgHex(c.textMuted) + `(○) ` + ansi.reset;
        line += ansi.fgHex(c.accent) + item.name + ansi.reset;
        
        out.push(line);
        out.push('\n');
      }
    }

    // Footer
    out.push('\n');
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi.reset);
    out.push('\n');

    const selectedCount = selected.size;
    out.push(ansi.fgHex(c.textMuted));
    out.push(`  ${selectedCount} provider${selectedCount !== 1 ? 's' : ''} selected`);
    out.push(ansi.reset);
    out.push('\n');

    process.stdout.write(out.join(''));
  }

  return new Promise<ProviderSelectionResult>((resolve) => {
    // Set raw mode to capture individual keypresses
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      if (done) return;

      const buf = Buffer.from(data);
      const key = parseKey(buf);

      switch (key.name) {
        case 'up':
          cursorIndex = (cursorIndex - 1 + totalItems) % totalItems;
          // Adjust scroll
          if (cursorIndex < scrollOffset) scrollOffset = cursorIndex;
          if (cursorIndex >= scrollOffset + maxVisible) scrollOffset = cursorIndex - maxVisible + 1;
          render();
          break;

        case 'down':
          cursorIndex = (cursorIndex + 1) % totalItems;
          if (cursorIndex >= scrollOffset + maxVisible) scrollOffset = cursorIndex - maxVisible + 1;
          if (cursorIndex < scrollOffset) scrollOffset = cursorIndex;
          render();
          break;

        case 'return':
        case 'space': {
          const item = allItems[cursorIndex];
          if (item.type === 'provider') {
            // Toggle selection
            if (selected.has(item.id)) {
              selected.delete(item.id);
            } else {
              selected.add(item.id);
            }
            // Move cursor down
            if (key.name === 'return') {
              // Check for meta options
              if (item.id === '__remove_custom') {
                done = true;
                result = { selectedProviders: [...selected], removeCustom: true };
                cleanup();
                resolve(result);
                return;
              }
              if (item.id === '__configure_aux') {
                done = true;
                result = { selectedProviders: [...selected], configureAux: true };
                cleanup();
                resolve(result);
                return;
              }
              if (item.id === '__leave_unchanged') {
                done = true;
                result = { selectedProviders: [...selected], leaveUnchanged: true };
                cleanup();
                resolve(result);
                return;
              }
            }
            render();
          } else if (key.name === 'return') {
            // Meta option selected via Enter
            if (item.id === '__remove_custom') {
              done = true;
              result = { selectedProviders: [...selected], removeCustom: true };
              cleanup();
              resolve(result);
              return;
            }
            if (item.id === '__configure_aux') {
              done = true;
              result = { selectedProviders: [...selected], configureAux: true };
              cleanup();
              resolve(result);
              return;
            }
            if (item.id === '__leave_unchanged') {
              done = true;
              result = { selectedProviders: [...selected], leaveUnchanged: true };
              cleanup();
              resolve(result);
              return;
            }
          }
          break;
        }

        case 'escape':
        case 'c':
          if (key.ctrl || key.name === 'escape') {
            done = true;
            result = { selectedProviders: [...selected] };
            cleanup();
            resolve(result);
            return;
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