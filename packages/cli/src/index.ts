// CLI entry point — arg parsing, surface detection, command dispatch

import { parseArgs } from 'util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

// ─── Version ──────────────────────────────────────────
const VERSION = '0.1.0';

// ─── Config paths ─────────────────────────────────────
const NEXUS_DIR = join(homedir(), '.nexus');
const CONFIG_PATH = join(NEXUS_DIR, 'config.json');
const KEYS_PATH = join(NEXUS_DIR, 'keys.json');

// ─── Arg parsing ──────────────────────────────────────
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    prompt: { type: 'string' },
    pipe: { type: 'boolean' },
    print: { type: 'boolean' },
    json: { type: 'boolean' },
    oneshot: { type: 'boolean' },
    model: { type: 'string', short: 'm' },
    provider: { type: 'string' },
    mode: { type: 'string' },
    session: { type: 'string' },
    'no-color': { type: 'boolean' },
    timeout: { type: 'string' },
    'max-tokens': { type: 'string' },
    system: { type: 'string' },
    'output-format': { type: 'string' },
  },
  strict: false,
});

// ─── Determine surface ────────────────────────────────
function isHeadlessMode(): boolean {
  if (values.print || values.json || values.pipe || values.oneshot) return true;
  if (process.env.NEXUS_HEADLESS === '1') return true;
  if (!process.stdout.isTTY) return true;
  return false;
}

// ─── Help text ────────────────────────────────────────
function printHelp(): void {
  console.log(`
Nexus v${VERSION} — Multi-model AI for humans and agents

USAGE
  nexus-cli                          Launch TUI (interactive mode)
  nexus-cli setup                    Run setup wizard
  nexus --prompt TEXT             Send prompt (headless)
  nexus --pipe                    Read prompt from stdin
  nexus --print                   Print output to stdout (plain text)
  nexus --json                    Output as NDJSON events
  nexus --oneshot                 Run prompt, print result, exit
  nexus serve --mcp               Start MCP server mode

FLAGS
  --prompt TEXT      Prompt to send (instead of interactive input)
  --pipe             Read prompt from stdin
  --print            Non-interactive, print output to stdout
  --json             Output as newline-delimited JSON events
  --oneshot          Run prompt, print result, exit (no session persistence)
  --model ID, -m     Model ID to use (overrides config)
  --provider ID      Provider to use
  --mode MODE        single | multi | conversational
  --session ID       Resume a named session
  --no-color         Strip ANSI (implied when not a TTY)
  --timeout N        Seconds before abort (default: 120)
  --max-tokens N     Override max tokens
  --system TEXT      Override system prompt
  --output-format    text | json | markdown (default: text)
  --help, -h         Show this help
  --version, -v      Print version and exit

EXIT CODES
  0  Success
  1  General error
  2  Configuration error
  3  Provider error
  4  Timeout
  5  Interrupted (Ctrl+C)

EXAMPLES
  nexus                                    # Launch TUI
  nexus setup                              # Run setup wizard
  nexus-cli --oneshot --prompt "2+2" --json    # Quick query (agent use)
  echo "hello" | nexus-cli --pipe              # Pipe prompt
  nexus-cli serve --mcp                        # Start MCP server
`);
}

// ─── Version ──────────────────────────────────────────
function printVersion(): void {
  console.log(`nexus-cli v${VERSION}`);
}

// ─── Ensure config exists ─────────────────────────────
function ensureConfig(): void {
  if (!existsSync(NEXUS_DIR)) {
    mkdirSync(NEXUS_DIR, { recursive: true });
  }
  if (!existsSync(join(NEXUS_DIR, 'sessions'))) {
    mkdirSync(join(NEXUS_DIR, 'sessions'), { recursive: true });
  }
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify({
      project_name: 'Nexus',
      version: '1',
      mode: 'single',
      theme: 'nexus',
      providers: {},
      models: {},
      model_aliases: {},
      agents: {},
      conversational: { models: [], parallel: true },
      keybinds: { leader: 'ctrl+x' },
      tui: { prompt_max_width: 'auto', sidebar: 'auto', diff_style: 'auto' },
      headless: { default_output: 'json', timeout: 120 },
    }, null, 2));
  }
  if (!existsSync(KEYS_PATH)) {
    writeFileSync(KEYS_PATH, '{}', { mode: 0o600 });
  }
}

// ─── Load config ──────────────────────────────────────
function loadConfig(): Record<string, unknown> {
  ensureConfig();
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
}

// ─── Main ─────────────────────────────────────────────
async function main(): Promise<void> {
  // Handle --help
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Handle --version
  if (values.version) {
    printVersion();
    process.exit(0);
  }

  // Ensure config exists
  ensureConfig();
  const config = loadConfig();

  // Determine mode
  const headless = isHeadlessMode();

  if (headless) {
    await runHeadless(config);
  } else {
    await runTUI(config);
  }
}

// ─── Headless runner ──────────────────────────────────
async function runHeadless(config: Record<string, unknown>): Promise<void> {
  const sessionId = `sess_${randomUUID().slice(0, 8)}`;
  const model = (values.model as string) || 'unknown';
  const mode = (values.mode as string) || (config.mode as string) || 'single';
  const project = (config.project_name as string) || 'Nexus';

  // Get prompt
  let prompt = values.prompt as string;
  if (values.pipe || !prompt) {
    // Read from stdin
    prompt = await new Promise<string>((resolve) => {
      let data = '';
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', (chunk) => { data += chunk; });
      process.stdin.on('end', () => resolve(data.trim()));
      process.stdin.resume();
    });
  }

  if (!prompt) {
    // Emit error
    process.stdout.write(JSON.stringify({
      type: 'error',
      session_id: sessionId,
      message: 'No prompt provided. Use --prompt or pipe via stdin.',
      code: 2,
      ts: Date.now(),
    }) + '\n');
    process.exit(2);
  }

  // Emit session start
  process.stdout.write(JSON.stringify({
    type: 'session.start',
    session_id: sessionId,
    model,
    mode,
    project,
    ts: Date.now(),
  }) + '\n');

  // Emit content delta
  process.stdout.write(JSON.stringify({
    type: 'content.delta',
    session_id: sessionId,
    text: `Nexus received your prompt: "${prompt}"\n\n`,
    model,
    ts: Date.now(),
  }) + '\n');

  // Emit content done
  process.stdout.write(JSON.stringify({
    type: 'content.done',
    session_id: sessionId,
    text: `Nexus received your prompt: "${prompt}"\n\nThis is a placeholder response. The full implementation will connect to your configured AI provider.`,
    model,
    tokens: { input: prompt.length, output: 100 },
    duration_ms: 50,
    ts: Date.now(),
  }) + '\n');

  // Emit session end
  process.stdout.write(JSON.stringify({
    type: 'session.end',
    session_id: sessionId,
    ts: Date.now(),
  }) + '\n');

  process.exit(0);
}

// ─── TUI runner ───────────────────────────────────────
async function runTUI(config: Record<string, unknown>): Promise<void> {
  // Check if setup is needed
  const providers = config.providers as Record<string, { enabled: boolean }> || {};
  const hasProviders = Object.keys(providers).some(k => providers[k]?.enabled);

  if (!hasProviders) {
    // Run setup wizard
    const { runSetupWizard } = await import('@nexus-ai/tui');
    const setupResult = await runSetupWizard();
    
    // Save config
    const newConfig = {
      ...config,
      project_name: setupResult.project_name,
      providers: setupResult.providers,
      models: setupResult.models,
    };
    writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    
    console.log('\nSetup complete! Press Enter to launch...');
    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve());
      process.stdin.resume();
    });
  }

  // Show home screen
  const { renderHomeScreen } = await import('@nexus-ai/tui');
  const homeOutput = renderHomeScreen({
    projectName: (config.project_name as string) || 'Nexus',
    version: VERSION,
    currentModel: (values.model as string) || 'default',
    providers: Object.keys(providers),
    providerCount: Object.keys(providers).length,
    modelCount: Object.values(config.models || {}).flat().length,
    cwd: process.cwd(),
    mode: (config.mode as string) || 'single',
  });
  console.log(homeOutput);

  // Wait for input
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', async (data: string) => {
    // Ctrl+C / Ctrl+D to exit
    if (data === '\x03' || data === '\x04') {
      process.exit(0);
    }
    // Ctrl+P for command palette
    if (data === '\x10') {
      const { renderCommandPalette } = await import('@nexus-ai/tui');
      const cmd = await renderCommandPalette();
      if (cmd) {
        console.log(`Command: ${cmd.name}`);
      }
    }
    // Enter = start new session
    if (data === '\r' || data === '\n') {
      console.log('Starting new session...');
      process.exit(0);
    }
  });
}

// ─── Entry ────────────────────────────────────────────
main().catch((err) => {
  console.error(err);
  process.exit(1);
});