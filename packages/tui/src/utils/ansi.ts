// Terminal UI utilities — ANSI helpers, text measurement, key parsing

export const ESC = '\x1b';
export const CSI = `${ESC}[`;

export const ansi = {
  // Colors (256 + truecolor)
  fg: (r: number, g: number, b: number) => `${CSI}38;2;${r};${g};${b}m`,
  bg: (r: number, g: number, b: number) => `${CSI}48;2;${r};${g};${b}m`,
  fgHex: (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ansi.fg(r, g, b);
  },
  bgHex: (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ansi.bg(r, g, b);
  },
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,
  inverse: `${CSI}7m`,
  strikethrough: `${CSI}9m`,
  // Cursor
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  saveCursor: `${ESC}7`,
  restoreCursor: `${ESC}8`,
  // Screen
  altScreen: `${ESC}[?1049h`,
  normalScreen: `${ESC}[?1049l`,
  clearScreen: `${CSI}2J`,
  clearLine: `${CSI}2K`,
  clearToEnd: `${CSI}0K`,
  // Cursor movement
  moveTo: (row: number, col: number) => `${CSI}${row};${col}H`,
  moveUp: (n = 1) => `${CSI}${n}A`,
  moveDown: (n = 1) => `${CSI}${n}B`,
  moveRight: (n = 1) => `${CSI}${n}C`,
  moveLeft: (n = 1) => `${CSI}${n}D`,
  // Scrolling
  scrollUp: (n = 1) => `${CSI}${n}S`,
  scrollDown: (n = 1) => `${CSI}${n}T`,
};

/** Strip ANSI escape codes from a string */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '');
}

/** Measure visible (non-ANSI) width of a string */
export function visibleWidth(str: string): number {
  return stripAnsi(str).length;
}

/** Pad/truncate a string to a visible width, preserving ANSI codes */
export function padOrTruncate(str: string, targetWidth: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const visible = visibleWidth(str);
  if (visible >= targetWidth) return str; // truncate later if needed
  
  const pad = targetWidth - visible;
  const leftPad = align === 'right' ? pad : align === 'center' ? Math.floor(pad / 2) : 0;
  const rightPad = align === 'left' ? pad : align === 'center' ? pad - leftPad : 0;
  
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

/** Wrap text to fit within a given width, respecting ANSI codes */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  for (const char of text) {
    if (char === '\n') {
      lines.push(currentLine);
      currentLine = '';
      currentWidth = 0;
      continue;
    }
    
    // Skip ANSI escape sequences for width calculation
    if (char === '\x1b') {
      // Find end of escape sequence
      let escEnd = currentLine.length;
      while (escEnd < currentLine.length && currentLine[escEnd] !== 'm' && currentLine[escEnd] !== 'K') {
        escEnd++;
      }
      currentLine += char;
      continue;
    }
    
    currentLine += char;
    currentWidth++;
    
    if (currentWidth >= maxWidth) {
      lines.push(currentLine);
      currentLine = '';
      currentWidth = 0;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/** Parse a keypress from raw input */
export interface ParsedKey {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
}

export function parseKey(data: Buffer): ParsedKey {
  const str = data.toString();
  const key: ParsedKey = {
    name: '',
    ctrl: false,
    meta: false,
    shift: false,
    sequence: str,
  };

  if (str === '\x03') { key.name = 'c'; key.ctrl = true; return key; }
  if (str === '\x04') { key.name = 'd'; key.ctrl = true; return key; }
  if (str === '\x1b') {
    if (str.length === 1) { key.name = 'escape'; return key; }
    if (str === '\x1b[1;3A') { key.name = 'up'; key.meta = true; return key; }
    if (str === '\x1b[1;3B') { key.name = 'down'; key.meta = true; return key; }
    // Arrow keys
    if (str === '\x1b[A') { key.name = 'up'; return key; }
    if (str === '\x1b[B') { key.name = 'down'; return key; }
    if (str === '\x1b[C') { key.name = 'right'; return key; }
    if (str === '\x1b[D') { key.name = 'left'; return key; }
    // Enter
    if (str === '\r' || str === '\n') { key.name = 'return'; return key; }
    // Space
    if (str === ' ') { key.name = 'space'; return key; }
    // Tab
    if (str === '\t') { key.name = 'tab'; return key; }
  }
  
  // Ctrl combinations
  if (str.length === 1 && str.charCodeAt(0) >= 1 && str.charCodeAt(0) <= 26) {
    key.name = String.fromCharCode(str.charCodeAt(0) + 96);
    key.ctrl = true;
    return key;
  }

  // Regular character
  if (str.length === 1) {
    key.name = str;
    return key;
  }

  return key;
}

/** Format a duration in ms to a human-readable string */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/** Format token count */
export function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1000000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1000000).toFixed(1)}M`;
}

/** Truncate a string to a visible width with ellipsis */
export function truncate(str: string, maxWidth: number): string {
  const vis = visibleWidth(str);
  if (vis <= maxWidth) return str;
  return str.slice(0, maxWidth - 1) + '…';
}