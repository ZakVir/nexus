// Mode switcher — select operating mode (Single, Multi, Conversational)

import { ansi } from '../utils/ansi.js';
import type { Theme } from '../theme/index.js';
import { defaultTheme } from '../theme/index.js';

export type OperatingMode = 'single' | 'multi' | 'conversational';

export interface ModeOption {
  id: OperatingMode;
  name: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { id: 'single', name: 'Single Model', description: 'Standard coding with one model' },
  { id: 'multi', name: 'Multi-Model', description: 'Orchestrator + specialist agents' },
  { id: 'conversational', name: 'Full Conversational', description: 'Panel of models that discuss together' },
];

/**
 * Render the mode switcher overlay.
 * Returns the selected mode or null if cancelled.
 */
export async function renderModeSwitcher(
  currentMode: OperatingMode = 'single',
  theme: Theme = defaultTheme
): Promise<OperatingMode | null> {
  const c = theme.colors;
  let cursorIndex = MODE_OPTIONS.findIndex(m => m.id === currentMode);
  if (cursorIndex < 0) cursorIndex = 0;
  let done = false;
  let result: OperatingMode | null = null;

  function render() {
    const out: string[] = [];
    out.push(ansi.altScreen);
    out.push(ansi.clearScreen);
    out.push(ansi.moveTo(0, 0));
    out.push(ansi.hideCursor);
    
    // Title
    out.push(ansi.fgHex(c.primary) + ansi.bold);
    out.push('  Operating mode');
    out.push(ansi.reset);
    out.push('\n\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(60));
    out.push(ansi.reset);
    out.push('\n\n');
    
    // Options
    for (let i = 0; i < MODE_OPTIONS.length; i++) {
      const opt = MODE_OPTIONS[i];
      const isActive = i === cursorIndex;
      const isCurrent = opt.id === currentMode;
      
      if (isActive) {
        out.push(ansi.fgHex(c.primary) + '  → ' + ansi.reset);
      } else {
        out.push('    ');
      }
      
      // Radio button
      if (isCurrent) {
        out.push(ansi.fgHex(c.primary) + '(●) ' + ansi.reset);
      } else {
        out.push(ansi.fgHex(c.textMuted) + '(○) ' + ansi.reset);
      }
      
      // Name
      out.push(ansi.fgHex(isActive ? c.primary : c.text) + opt.name + ansi.reset);
      
      // Description (aligned)
      const descPad = Math.max(0, 25 - opt.name.length);
      out.push(' '.repeat(descPad) + ansi.fgHex(c.textMuted) + opt.description + ansi.reset);
      
      out.push('\n');
    }
    
    // Footer
    out.push('\n');
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(60));
    out.push(ansi.reset);
    out.push('\n');
    out.push(ansi.fgHex(c.textMuted));
    out.push('  ↑↓ move  ·  enter select  ·  esc cancel');
    out.push(ansi.reset);
    
    process.stdout.write(out.join(''));
  }

  return new Promise<OperatingMode | null>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      if (done) return;

      switch (data) {
        case '\x1b[A': // Up
          cursorIndex = (cursorIndex - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length;
          render();
          break;
        case '\x1b[B': // Down
          cursorIndex = (cursorIndex + 1) % MODE_OPTIONS.length;
          render();
          break;
        case '\r': // Enter
          done = true;
          result = MODE_OPTIONS[cursorIndex].id;
          cleanup();
          resolve(result);
          break;
        case '\x1b': // Escape
        case '\x03': // Ctrl+C
          done = true;
          result = null;
          cleanup();
          resolve(null);
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