// Welcome screen — Nexus ASCII logo + "Press Enter to begin"

import { ansi } from '../utils/ansi.js';
import type { Theme } from '../theme/index.js';
import { defaultTheme } from '../theme/index.js';

// Sub-pixel block logo (▀/▄/█ with fg/bg coloring for each pixel row)
// Uses the OpenCode technique: top half-row uses ▀ with fg=color, bg=bg
// bottom half-row uses ▄ with fg=color, bg=bg
function renderLogo(primaryHex: string, secondaryHex: string): string[] {
  const lines: string[] = [];
  const c = ansi.fgHex(primaryHex);
  const s = ansi.fgHex(secondaryHex);
  const r = ansi.reset;

  // N
  lines.push(`${c}███╗  ██╗${r}${s}███████╗${r}${c}██╗  ██╗${r}${s}██╗   ██╗${r}${c}███████╗${r}`);
  // E
  lines.push(`${c}████╗ ██║${r}${s}██╔════╝${r}${c}╚██╗██╔╝${r}${s}██║   ██║${r}${c}██╔════╝${r}`);
  // X
  lines.push(`${c}██╔██╗██║${r}${s}█████╗${r}${c}   ╚███╔╝ ${r}${s}██║   ██║${r}${c}███████╗${r}`);
  // U
  lines.push(`${c}██║╚████║${r}${s}██╔══╝${r}${c}   ██╔██╗ ${r}${s}██║   ██║${r}${c}╚════██║${r}`);
  // S
  lines.push(`${c}██║ ╚███║${r}${s}███████╗${r}${c}██╔╝ ██╗${r}${s}╚██████╔╝${r}${c}███████║${r}`);
  // Bottom line
  lines.push(`${c}╚═╝  ╚══╝${r}${s}╚══════╝${r}${c}╚═╝  ╚═╝ ${r}${s} ╚═════╝ ${r}${c}╚══════╝${r}`);

  return lines;
}

/**
 * Render the welcome screen.
 * Returns when user presses Enter.
 */
export async function renderWelcomeScreen(
  projectName: string,
  version: string,
  theme: Theme = defaultTheme
): Promise<void> {
  const c = theme.colors;
  const termWidth = process.stdout.columns || 80;

  function render() {
    const out: string[] = [];
    
    out.push(ansi.altScreen);
    out.push(ansi.clearScreen);
    out.push(ansi.moveTo(0, 0));
    out.push(ansi.hideCursor);
    
    // Top spacers
    out.push('\n');
    out.push('\n');
    
    // Logo
    const logo = renderLogo(c.primary, c.text);
    for (const line of logo) {
      // Center the logo
      const lineWidth = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
      const pad = Math.max(0, Math.floor((termWidth - lineWidth) / 2));
      out.push(' '.repeat(pad) + line + '\n');
    }
    
    // Project name + version
    const subtitle = `${projectName} · v${version}`;
    const subPad = Math.max(0, Math.floor((termWidth - subtitle.length) / 2));
    out.push('\n');
    out.push(' '.repeat(subPad) + ansi.fgHex(c.textMuted) + subtitle + ansi.reset + '\n');
    
    // Spacer
    out.push('\n');
    
    // Prompt box
    const promptText = 'What would you like to do?';
    const boxWidth = Math.min(termWidth - 4, 50);
    const boxPad = Math.max(0, Math.floor((termWidth - boxWidth) / 2));
    
    out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '╭' + '─'.repeat(boxWidth - 2) + '╮' + ansi.reset + '\n');
    
    const textPad = Math.max(0, Math.floor((boxWidth - 2 - promptText.length) / 2));
    out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset + 
             ' '.repeat(textPad) + ansi.fgHex(c.text) + promptText + ansi.reset + 
             ' '.repeat(Math.max(0, boxWidth - 2 - textPad - promptText.length)) + 
             ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');
    
    out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset + ' '.repeat(boxWidth - 2) + ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');
    
    // Model selector row
    const modelRow = `[model: DS Flash ▾]  [▸]`;
    const modelPad = Math.max(0, Math.floor((boxWidth - 2 - modelRow.length) / 2));
    out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset + 
             ' '.repeat(modelPad) + ansi.fgHex(c.primary) + modelRow + ansi.reset + 
             ' '.repeat(Math.max(0, boxWidth - 2 - modelPad - modelRow.length)) + 
             ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');
    
    out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '╰' + '─'.repeat(boxWidth - 2) + '╯' + ansi.reset + '\n');
    
    // Spacer
    out.push('\n');
    out.push('\n');
    
    // Footer line
    out.push(ansi.fgHex(c.borderSubtle));
    out.push('─'.repeat(termWidth));
    out.push(ansi.reset);
    out.push('\n');
    
    // Instructions
    const instruction = 'Press Enter to begin setup  ·  Ctrl+C to exit';
    const instrPad = Math.max(0, Math.floor((termWidth - instruction.length) / 2));
    out.push(ansi.fgHex(c.textMuted));
    out.push(' '.repeat(instrPad) + instruction);
    out.push(ansi.reset);
    
    process.stdout.write(out.join(''));
  }

  return new Promise<void>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      if (data === '\r' || data === '\n') {
        cleanup();
        resolve();
        return;
      }
      if (data === '\x03') {
        process.exit(0);
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