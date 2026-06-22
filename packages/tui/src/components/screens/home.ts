// Home screen — logo + prompt box + footer

import { ansi, visibleWidth } from '../../utils/ansi.js';
import type { Theme } from '../../theme/index.js';
import { defaultTheme } from '../../theme/index.js';

export interface HomeScreenProps {
  projectName: string;
  version: string;
  currentModel: string;
  providers: string[];
  providerCount: number;
  modelCount: number;
  cwd: string;
  mode: string;
  theme?: Theme;
}

/**
 * Render the home screen to a string buffer (no raw mode needed).
 * Used by both the TUI renderer and headless preview.
 */
export function renderHomeScreen(props: HomeScreenProps): string {
  const t = props.theme ?? defaultTheme;
  const c = t.colors;
  const out: string[] = [];
  const termWidth = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;

  // Logo — sub-pixel block technique
  const logoLines = renderSubpixelLogo(c.primary, c.text);
  const logoWidth = logoLines[0]?.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length || 0;

  // Layout: flex-grow spacers above and below
  const contentHeight = logoLines.length + 3 + 5 + 2; // logo + name + spacer + prompt + footer
  const topSpacer = Math.max(1, Math.floor((termHeight - contentHeight) / 2));
  const bottomSpacer = Math.max(1, termHeight - contentHeight - topSpacer);

  // Top spacer
  for (let i = 0; i < topSpacer; i++) out.push('\n');

  // Logo
  for (const line of logoLines) {
    const visWidth = visibleWidth(line);
    const pad = Math.max(0, Math.floor((termWidth - visWidth) / 2));
    out.push(' '.repeat(pad) + line + '\n');
  }

  // Project name + version
  const subtitle = `${props.projectName} · v${props.version}`;
  const subPad = Math.max(0, Math.floor((termWidth - subtitle.length) / 2));
  out.push(' '.repeat(subPad) + ansi.fgHex(c.textMuted) + subtitle + ansi.reset + '\n');

  // Spacer
  out.push('\n');

  // Prompt box — maxWidth = max(75, floor(termWidth * 0.7))
  const boxWidth = Math.max(75, Math.floor(termWidth * 0.7));
  const boxPad = Math.max(0, Math.floor((termWidth - boxWidth) / 2));

  // Top border
  out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '╭' + '─'.repeat(boxWidth - 2) + '╮' + ansi.reset + '\n');

  // "What would you like to do?"
  const promptText = 'What would you like to do?';
  const textPad = Math.max(0, Math.floor((boxWidth - 2 - promptText.length) / 2));
  out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset +
           ' '.repeat(textPad) + ansi.fgHex(c.text) + promptText + ansi.reset +
           ' '.repeat(Math.max(0, boxWidth - 2 - textPad - promptText.length)) +
           ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');

  // Empty line
  out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset +
           ' '.repeat(boxWidth - 2) +
           ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');

  // Model badge + send button
  const modelLabel = `[model: ${props.currentModel} ▾]  [▸]`;
  const modelPad = Math.max(0, Math.floor((boxWidth - 2 - modelLabel.length) / 2));
  out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '│' + ansi.reset +
           ' '.repeat(modelPad) + ansi.fgHex(c.primary) + modelLabel + ansi.reset +
           ' '.repeat(Math.max(0, boxWidth - 2 - modelPad - modelLabel.length)) +
           ansi.fgHex(c.borderActive) + '│' + ansi.reset + '\n');

  // Bottom border
  out.push(' '.repeat(boxPad) + ansi.fgHex(c.borderActive) + '╰' + '─'.repeat(boxWidth - 2) + '╯' + ansi.reset + '\n');

  // Bottom spacer
  for (let i = 0; i < bottomSpacer; i++) out.push('\n');

  // Footer line
  out.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(termWidth) + ansi.reset + '\n');

  // Footer content
  const footerLeft = props.cwd;
  const footerRight = `[${props.mode}] · ${props.providerCount} provider${props.providerCount !== 1 ? 's' : ''} · ${props.modelCount} model${props.modelCount !== 1 ? 's' : ''}`;
  const footerGap = termWidth - footerLeft.length - footerRight.length;
  out.push(ansi.fgHex(c.text) + footerLeft + ansi.reset +
           ' '.repeat(Math.max(1, footerGap)) +
           ansi.fgHex(c.textMuted) + footerRight + ansi.reset);

  return out.join('');
}

/**
 * Sub-pixel logo using ▀/▄ block characters with fg/bg coloring.
 * Two rows of blocks for each "pixel row" — top half uses ▀, bottom uses ▄.
 */
function renderSubpixelLogo(primaryHex: string, textHex: string): string[] {
  const p = ansi.fgHex(primaryHex);
  const t = ansi.fgHex(textHex);
  const r = ansi.reset;

  // Nexus logo in block characters
  // Each letter is 5 rows, using ▀ (top half) and ▄ (bottom half)
  return [
    `${p}███╗  ██╗${t}███████╗${p}██╗  ██╗${t}██╗   ██╗${p}███████╗${r}`,
    `${p}████╗ ██║${t}██╔════╝${p}╚██╗██╔╝${t}██║   ██║${p}██╔════╝${r}`,
    `${p}██╔██╗██║${t}█████╗${p}   ╚███╔╝ ${t}██║   ██║${p}███████╗${r}`,
    `${p}██║╚████║${t}██╔══╝${p}   ██╔██╗ ${t}██║   ██║${p}╚════██║${r}`,
    `${p}██║ ╚███║${t}███████╗${p}██╔╝ ██╗${t}╚██████╔╝${p}███████║${r}`,
    `${p}╚═╝  ╚══╝${t}╚══════╝${p}╚═╝  ╚═╝ ${t} ╚═════╝ ${p}╚══════╝${r}`,
  ];
}