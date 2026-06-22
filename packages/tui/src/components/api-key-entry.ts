// API Key entry component — masked input with validation

import { ansi } from '../utils/ansi.js';
import type { Theme } from '../theme/index.js';
import { defaultTheme } from '../theme/index.js';
import { PROVIDER_DEFS } from '../../../core/src/providers/definitions.js';

export interface ApiKeyEntryResult {
  providerId: string;
  key?: string;
  skipped: boolean;
  valid?: boolean;
  error?: string;
}

/**
 * Render API key entry for a single provider.
 * Masks the key as typed (shows last 4 chars only).
 */
export async function renderApiKeyEntry(
  providerId: string,
  theme: Theme = defaultTheme,
  validate?: (key: string) => Promise<{ valid: boolean; error?: string }>
): Promise<ApiKeyEntryResult> {
  const c = theme.colors;
  const provider = PROVIDER_DEFS.find(p => p.id === providerId);
  const providerName = provider?.name || providerId;
  
  let key = '';
  let cursorPos = 0;
  let done = false;
  let result: ApiKeyEntryResult = { providerId, key: '', skipped: true };

  function render() {
    const out: string[] = [];
    
    out.push(ansi.altScreen);
    out.push(ansi.clearScreen);
    out.push(ansi.moveTo(0, 0));
    out.push(ansi.hideCursor);
    
    // Title
    out.push(ansi.fgHex(c.primary) + ansi.bold);
    out.push(`  ${providerName} API Key`);
    out.push(ansi.reset);
    out.push('\n\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(60));
    out.push(ansi.reset);
    out.push('\n\n');
    
    // Instructions
    out.push(ansi.fgHex(c.text));
    out.push('  Paste your key below. It will be stored in\n');
    out.push('  ~/.nexus/keys.json (chmod 600, never logged).\n');
    out.push(ansi.reset);
    out.push('\n');
    
    // Key input
    out.push(ansi.fgHex(c.textMuted));
    out.push('  Key:  ');
    out.push(ansi.reset);
    
    // Show masked key
    if (key.length === 0) {
      out.push(ansi.fgHex(c.textSubtle) + '___' + ansi.reset);
    } else {
      // Show dots for all but last 4 chars
      const masked = '•'.repeat(Math.max(0, key.length - 4));
      const visible = key.slice(-4);
      out.push(ansi.fgHex(c.textMuted) + masked + ansi.fgHex(c.text) + visible + ansi.reset);
    }
    
    // Cursor
    out.push(ansi.fgHex(c.primary) + '█' + ansi.reset);
    out.push('\n\n');
    
    // Separator
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(60));
    out.push(ansi.reset);
    out.push('\n');
    
    // Footer
    out.push(ansi.fgHex(c.textMuted));
    out.push('  Enter to confirm  ·  Ctrl+U to clear  ·  Esc to skip');
    out.push(ansi.reset);
    
    process.stdout.write(out.join(''));
  }

  return new Promise<ApiKeyEntryResult>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      if (done) return;

      // Ctrl+U to clear
      if (data === '\x15') {
        key = '';
        cursorPos = 0;
        render();
        return;
      }

      // Enter to confirm
      if (data === '\r' || data === '\n') {
        done = true;
        result = { providerId, key, skipped: false };
        cleanup();
        resolve(result);
        return;
      }

      // Escape to skip
      if (data === '\x1b') {
        done = true;
        result = { providerId, key: '', skipped: true };
        cleanup();
        resolve(result);
        return;
      }

      // Ctrl+C to exit
      if (data === '\x03') {
        process.exit(0);
      }

      // Backspace
      if (data === '\x7f' || data === '\x08') {
        key = key.slice(0, -1);
        render();
        return;
      }

      // Regular character
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        key += data;
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