// Model list configuration — paste model IDs, one per line

import { ansi } from '../utils/ansi.js';
import type { Theme } from '../theme/index.js';
import { defaultTheme } from '../theme/index.js';
import { PROVIDER_DEFS } from '../../../core/src/providers/definitions.js';

export interface ModelListResult {
  providerId: string;
  models: string[];
  cancelled: boolean;
}

/**
 * Render a multi-line model ID input for a specific provider.
 * User types model IDs, one per line. Empty line = finish.
 */
export async function renderModelListInput(
  providerId: string,
  existingModels: string[] = [],
  theme: Theme = defaultTheme
): Promise<ModelListResult> {
  const c = theme.colors;
  const provider = PROVIDER_DEFS.find(p => p.id === providerId);
  const providerName = provider?.name || providerId;
  
  let models = [...existingModels];
  let currentInput = '';
  let done = false;
  let result: ModelListResult = { providerId, models: [], cancelled: true };

  function render() {
    const out: string[] = [];
    
    out.push(ansi.altScreen);
    out.push(ansi.clearScreen);
    out.push(ansi.moveTo(0, 0));
    out.push(ansi.hideCursor);
    
    // Title
    out.push(ansi.fgHex(c.primary) + ansi.bold);
    out.push(`  ${providerName} model IDs  (one per line, paste from provider website)`);
    out.push(ansi.reset);
    out.push('\n\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(60));
    out.push(ansi.reset);
    out.push('\n');
    
    // Existing models
    for (const model of models) {
      out.push(ansi.fgHex(c.text));
      out.push(`  ${model}`);
      out.push(ansi.reset);
      out.push('\n');
    }
    
    // Current input line
    out.push(ansi.fgHex(c.primary));
    out.push(`  ${currentInput}`);
    out.push(ansi.reset);
    out.push(ansi.fgHex(c.textSubtle));
    out.push('█');
    out.push(ansi.reset);
    out.push('\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(60));
    out.push(ansi.reset);
    out.push('\n');
    
    // Footer
    out.push(ansi.fgHex(c.textMuted));
    out.push('  Enter blank line to finish  ·  Esc to cancel');
    out.push(ansi.reset);
    
    process.stdout.write(out.join(''));
  }

  return new Promise<ModelListResult>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      if (done) return;

      // Ctrl+C
      if (data === '\x03') {
        process.exit(0);
      }

      // Escape to cancel
      if (data === '\x1b') {
        done = true;
        result = { providerId, models: [], cancelled: true };
        cleanup();
        resolve(result);
        return;
      }

      // Enter to add current line
      if (data === '\r' || data === '\n') {
        if (currentInput.trim() === '') {
          // Empty line = finish
          done = true;
          result = { providerId, models, cancelled: false };
          cleanup();
          resolve(result);
          return;
        }
        // Add model to list
        models.push(currentInput.trim());
        currentInput = '';
        render();
        return;
      }

      // Backspace
      if (data === '\x7f' || data === '\x08') {
        currentInput = currentInput.slice(0, -1);
        render();
        return;
      }

      // Regular character
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        currentInput += data;
        render();
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