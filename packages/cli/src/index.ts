// CLI entry point — arg parsing, surface detection, command dispatch.
// Wires the human (TUI) and agent (headless/MCP) surfaces to the real provider engine.

import { parseArgs } from 'util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { createInterface } from 'readline/promises';

import {
  streamText,
  runText,
  makeCompleteFn,
  NexusError,
  Orchestrator,
  MultiModelRunner,
  ConversationalAgent,
  type EngineRequest,
} from '@nexus-ai/agent';
import { renderHomeScreen } from '@nexus-ai/tui';
import type { ChatMessage } from '@nexus-ai/core';
import { createMcpServer } from './mcp-server.js';

// ─── Version ──────────────────────────────────────────
const VERSION = '0.1.0';

// ─── Config paths ─────────────────────────────────────
const NEXUS_DIR = join(homedir(), '.nexus');
const CONFIG_PATH = join(NEXUS_DIR, 'config.json');
const KEYS_PATH = join(NEXUS_DIR, 'keys.json');

// Registry-backed providers (the ones with a real implementation).
const PROVIDERS: Array<{ id: string; label: string; needsKey: boolean }> = [
  { id: 'anthropic', label: 'Anthropic — Claude (Opus, Sonnet, Haiku)', needsKey: true },
  { id: 'openrouter', label: 'OpenRouter — 700+ models via one key', needsKey: true },
  { id: 'nvidia', label: 'NVIDIA — Nemotron / Llama / Mistral (NIM)', needsKey: true },
  { id: 'openai', label: 'OpenAI — GPT / o-series', needsKey: true },
  { id: 'google', label: 'Google — Gemini', needsKey: true },
  { id: 'groq', label: 'Groq — fast Llama / Mixtral', needsKey: true },
  { id: 'mistral', label: 'Mistral — Mixtral / Codestral', needsKey: true },
  { id: 'cohere', label: 'Cohere — Command R', needsKey: true },
  { id: 'ollama', label: 'Ollama — local models', needsKey: false },
  { id: 'custom', label: 'Custom — OpenAI-compatible endpoint', needsKey: true },
];

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
    mcp: { type: 'boolean' },
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
  allowPositionals: true,
  strict: false,
});

if (values['no-color']) process.env.NO_COLOR = '1';

// ─── Surface detection ────────────────────────────────
function isHeadlessMode(): boolean {
  if (values.print || values.json || values.pipe || values.oneshot) return true;
  if (process.env.NEXUS_HEADLESS === '1') return true;
  if (!process.stdout.isTTY) return true;
  return false;
}

// ─── Help / version ───────────────────────────────────
function printHelp(): void {
  console.log(`
Nexus v${VERSION} — Multi-model AI for humans and agents

USAGE
  nexus-cli                       Launch TUI (interactive mode)
  nexus-cli setup                 Run setup wizard
  nexus-cli --prompt TEXT         Send prompt (headless)
  nexus-cli --pipe                Read prompt from stdin
  nexus-cli --print               Print output to stdout (plain text)
  nexus-cli --json                Output as NDJSON events
  nexus-cli --oneshot             Run prompt, print result, exit
  nexus-cli serve --mcp           Start MCP server mode (stdio JSON-RPC)

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
  0  Success    1  General error    2  Configuration error
  3  Provider error    4  Timeout    5  Interrupted (Ctrl+C)

EXAMPLES
  nexus-cli                                       # Launch TUI
  nexus-cli setup                                 # Run setup wizard
  nexus-cli --oneshot --prompt "2+2" --json       # Quick query (agent use)
  echo "hello" | nexus-cli --pipe                 # Pipe prompt
  nexus-cli serve --mcp                           # Start MCP server
`);
}

// ─── Config + keys ────────────────────────────────────
interface AnyConfig {
  project_name?: string;
  mode?: string;
  providers?: Record<string, { enabled?: boolean; base_url?: string }>;
  models?: Record<string, string[]>;
  headless?: { default_output?: string; timeout?: number };
  [k: string]: unknown;
}

function ensureConfig(): void {
  if (!existsSync(NEXUS_DIR)) mkdirSync(NEXUS_DIR, { recursive: true, mode: 0o700 });
  if (!existsSync(join(NEXUS_DIR, 'sessions'))) mkdirSync(join(NEXUS_DIR, 'sessions'), { recursive: true });
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
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
        },
        null,
        2
      )
    );
  }
  if (!existsSync(KEYS_PATH)) writeFileSync(KEYS_PATH, '{}', { mode: 0o600 });
}

function loadConfig(): AnyConfig {
  ensureConfig();
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function loadKeys(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(KEYS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfig(config: AnyConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function saveKeys(keys: Record<string, string>): void {
  writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2), { mode: 0o600 });
}

// ─── Timeout wrapper ──────────────────────────────────
function timeoutMs(): number {
  const n = values.timeout ? parseInt(values.timeout as string, 10) : NaN;
  return (Number.isFinite(n) ? n : 120) * 1000;
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  const ms = timeoutMs();
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new NexusError(`Timed out after ${ms / 1000}s`, 4)), ms)
    ),
  ]);
}

function commonReq(prompt: string): EngineRequest {
  return {
    prompt,
    model: values.model as string | undefined,
    provider: values.provider as string | undefined,
    system: values.system as string | undefined,
    maxTokens: values['max-tokens'] ? parseInt(values['max-tokens'] as string, 10) : undefined,
  };
}

function exitFromError(err: unknown): never {
  const code = err instanceof NexusError ? err.code : 1;
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

// ─── Headless runner ──────────────────────────────────
async function runHeadless(config: AnyConfig, keys: Record<string, string>): Promise<void> {
  const sessionId = `sess_${randomUUID().slice(0, 8)}`;
  const mode = (values.mode as string) || (config.mode as string) || 'single';
  const project = (config.project_name as string) || 'Nexus';

  // Resolve output format.
  const outputFormat = values.json
    ? 'json'
    : values.print
      ? 'text'
      : (values['output-format'] as string) || config.headless?.default_output || 'json';
  const json = outputFormat === 'json';

  // Resolve prompt (flag or stdin).
  let prompt = (values.prompt as string) || '';
  if ((values.pipe || !prompt) && !process.stdin.isTTY) {
    prompt = await readStdin();
  }
  if (!prompt) {
    const msg = 'No prompt provided. Use --prompt or pipe via stdin.';
    if (json) emit({ type: 'error', session_id: sessionId, message: msg, code: 2, ts: Date.now() });
    else process.stderr.write(msg + '\n');
    process.exit(2);
  }

  const started = Date.now();
  try {
    if (mode === 'conversational') {
      await withTimeout(runConversationalHeadless(config, keys, sessionId, prompt, json));
    } else if (mode === 'multi') {
      await withTimeout(runMultiHeadless(config, keys, sessionId, prompt, json));
    } else {
      await withTimeout(runSingleHeadless(config, keys, sessionId, prompt, json, project, started));
    }
  } catch (err) {
    if (json) {
      emit({
        type: 'error',
        session_id: sessionId,
        message: err instanceof Error ? err.message : String(err),
        code: err instanceof NexusError ? err.code : 1,
        ts: Date.now(),
      });
      process.exit(err instanceof NexusError ? err.code : 1);
    }
    exitFromError(err);
  }
  process.exit(0);
}

async function runSingleHeadless(
  config: AnyConfig,
  keys: Record<string, string>,
  sessionId: string,
  prompt: string,
  json: boolean,
  project: string,
  started: number
): Promise<void> {
  const req = commonReq(prompt);

  if (json) {
    // We resolve the target lazily through the engine; report the requested model.
    emit({
      type: 'session.start',
      session_id: sessionId,
      model: (values.model as string) || 'auto',
      mode: 'single',
      project,
      ts: Date.now(),
    });
  }

  let full = '';
  for await (const delta of streamText(config as any, keys, req)) {
    full += delta;
    if (json) emit({ type: 'content.delta', session_id: sessionId, text: delta, ts: Date.now() });
    else process.stdout.write(delta);
  }

  if (json) {
    emit({
      type: 'content.done',
      session_id: sessionId,
      text: full,
      model: (values.model as string) || 'auto',
      duration_ms: Date.now() - started,
      ts: Date.now(),
    });
    emit({ type: 'session.end', session_id: sessionId, ts: Date.now() });
  } else {
    process.stdout.write('\n');
  }

  // Best-effort persistence (skipped for --oneshot).
  if (!values.oneshot) await persistSingle(config, prompt, full).catch(() => {});
}

async function runMultiHeadless(
  config: AnyConfig,
  keys: Record<string, string>,
  sessionId: string,
  prompt: string,
  json: boolean
): Promise<void> {
  const orchestrator = buildOrchestrator(config);
  const runner = new MultiModelRunner({ orchestrator, complete: makeCompleteFn(config as any, keys) });
  const messages = await runner.run(prompt);
  for (const m of messages) {
    if (json) {
      emit({
        type: m.role === 'orchestrator' ? 'synthesis.done' : 'agent.message',
        session_id: sessionId,
        role: m.role,
        model: m.model,
        provider: m.provider,
        text: m.content,
        ts: m.timestamp,
      });
    } else {
      process.stdout.write(`\n[${m.role.toUpperCase()} › ${m.model}]\n${m.content}\n`);
    }
  }
}

async function runConversationalHeadless(
  config: AnyConfig,
  keys: Record<string, string>,
  sessionId: string,
  prompt: string,
  json: boolean
): Promise<void> {
  const conv = (config as any).conversational || {};
  const modelIds: string[] = conv.models && conv.models.length ? conv.models : modelsFromConfig(config);
  if (!modelIds.length) throw new NexusError('No models configured for conversational mode.', 2);
  const orchestratorModel = conv.orchestrator || modelIds[modelIds.length - 1];
  const defaultProvider = (values.provider as string) || firstEnabledProvider(config) || 'openrouter';

  const agent = new ConversationalAgent({
    models: modelIds.map((id) => ({ id, provider: defaultProvider })),
    orchestratorModel,
    orchestratorProvider: defaultProvider,
    complete: makeCompleteFn(config as any, keys),
  });

  const responses = await agent.run(prompt);
  for (const m of responses) {
    const isOrch = m.role === 'orchestrator';
    if (json) {
      emit({
        type: isOrch ? 'synthesis.done' : 'content.delta',
        session_id: sessionId,
        role: m.role,
        model: m.model,
        provider: m.provider,
        text: m.content,
        ts: m.timestamp,
      });
    } else {
      process.stdout.write(`\n╔ ${m.model} (${m.provider})\n${m.content}\n╚\n`);
    }
  }
}

// ─── Agent helpers ────────────────────────────────────
function modelsFromConfig(config: AnyConfig): string[] {
  return Object.values(config.models || {}).flat();
}

function firstEnabledProvider(config: AnyConfig): string | undefined {
  return Object.entries(config.providers || {}).find(([, v]) => v?.enabled)?.[0];
}

function buildOrchestrator(config: AnyConfig): Orchestrator {
  const agents = (config as any).agents || {};
  const list = Object.entries(agents)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([role, v]: [string, any]) => ({
      role: role as any,
      model: v.model,
      provider: v.provider,
      systemPrompt: v.system,
      temperature: v.temperature,
      maxTokens: v.max_tokens,
    }));
  if (!list.length) {
    const provider = firstEnabledProvider(config) || 'openrouter';
    const model = (values.model as string) || modelsFromConfig(config)[0];
    if (!model) throw new NexusError('No models configured for multi-model mode.', 2);
    list.push({
      role: 'all' as any,
      model,
      provider,
      systemPrompt: undefined,
      temperature: undefined,
      maxTokens: undefined,
    });
  }
  const defaultModel = list[0].model;
  return new Orchestrator(list, defaultModel);
}

async function persistSingle(config: AnyConfig, prompt: string, answer: string): Promise<void> {
  const { SessionStore } = await import('@nexus-ai/session');
  const store = new SessionStore();
  const session = store.createSession({
    title: prompt.slice(0, 60),
    mode: 'single',
    modelConfig: { provider: (values.provider as string) || '', model: (values.model as string) || '' },
    directory: process.cwd(),
  });
  store.createMessage({ sessionId: session.id, role: 'user', content: prompt });
  store.createMessage({ sessionId: session.id, role: 'assistant', content: answer, modelId: values.model as string });
  store.close();
}

// ─── stdin / NDJSON helpers ───────────────────────────
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.resume();
  });
}

function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + '\n');
}

// ─── Setup (readline-based, reliable) ─────────────────
async function runSetup(): Promise<void> {
  ensureConfig();
  const config = loadConfig();
  const keys = loadKeys();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  Nexus setup\n  ───────────────────────────────────────────────');
  console.log('  Select providers to enable (comma-separated numbers).\n');
  PROVIDERS.forEach((p, i) => {
    const on = config.providers?.[p.id]?.enabled ? ' (enabled)' : '';
    console.log(`    ${i + 1}. ${p.label}${on}`);
  });

  const pick = await rl.question('\n  Providers> ');
  const chosen = pick
    .split(',')
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < PROVIDERS.length)
    .map((i) => PROVIDERS[i]);

  config.providers = config.providers || {};
  config.models = config.models || {};

  for (const p of chosen) {
    config.providers[p.id] = { ...(config.providers[p.id] || {}), enabled: true };
    if (p.needsKey) {
      const existing = keys[p.id] ? ' (leave blank to keep current)' : '';
      const key = await rl.question(`  ${p.id} API key${existing}> `);
      if (key.trim()) keys[p.id] = key.trim();
    }
    const models = await rl.question(`  ${p.id} model IDs (comma-separated, blank to skip)> `);
    const ids = models.split(',').map((m) => m.trim()).filter(Boolean);
    if (ids.length) config.models[p.id] = ids;
  }

  const defaultName = (config.project_name && config.project_name !== 'Nexus')
    ? config.project_name
    : undefined;
  const { generateProjectName } = await import('@nexus-ai/core');
  const suggested = defaultName || generateProjectName();
  const name = await rl.question(`\n  Project name [${suggested}]> `);
  config.project_name = (name.trim() || suggested);

  saveConfig(config);
  saveKeys(keys);
  rl.close();

  console.log(`\n  ✓ Setup complete.`);
  console.log(`    Providers: ${chosen.map((c) => c.id).join(', ') || '(none)'}`);
  console.log(`    Models:    ${Object.values(config.models).flat().length}`);
  console.log(`    Project:   ${config.project_name}`);
  console.log(`\n  Run "nexus-cli" to start, or "nexus-cli --help".\n`);
}

// ─── MCP serve ────────────────────────────────────────
async function runServe(config: AnyConfig, keys: Record<string, string>): Promise<void> {
  const server = createMcpServer({ config, keys });
  await server.start();
}

// ─── TUI runner (interactive REPL) ────────────────────
async function runTUI(config: AnyConfig, keys: Record<string, string>): Promise<void> {
  const hasProviders = Object.values(config.providers || {}).some((p) => p?.enabled);
  if (!hasProviders) {
    console.log('\n  No providers configured yet — running setup.\n');
    await runSetup();
    Object.assign(config, loadConfig());
    Object.assign(keys, loadKeys());
  }

  const providerIds = Object.keys(config.providers || {}).filter((k) => config.providers?.[k]?.enabled);
  console.log(
    renderHomeScreen({
      projectName: (config.project_name as string) || 'Nexus',
      version: VERSION,
      currentModel: (values.model as string) || modelsFromConfig(config)[0] || 'default',
      providers: providerIds,
      providerCount: providerIds.length,
      modelCount: modelsFromConfig(config).length,
      cwd: process.cwd(),
      mode: (config.mode as string) || 'single',
    })
  );
  console.log('\n  Type a prompt and press Enter. Commands: /help, /model <id>, /exit\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('SIGINT', () => {
    rl.close();
    process.exit(0);
  });

  const history: ChatMessage[] = [];
  let currentModel = (values.model as string) || modelsFromConfig(config)[0];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const line = (await rl.question('› ')).trim();
    if (!line) continue;
    if (line === '/exit' || line === '/quit') break;
    if (line === '/help') {
      console.log('  /model <id>   switch model\n  /exit         quit\n');
      continue;
    }
    if (line.startsWith('/model ')) {
      currentModel = line.slice(7).trim();
      console.log(`  → model set to ${currentModel}\n`);
      continue;
    }

    history.push({ role: 'user', content: line });
    let answer = '';
    try {
      for await (const delta of streamText(config as any, keys, {
        messages: history,
        model: currentModel || (values.model as string),
        provider: values.provider as string | undefined,
        system: values.system as string | undefined,
      })) {
        answer += delta;
        process.stdout.write(delta);
      }
      process.stdout.write('\n\n');
      history.push({ role: 'assistant', content: answer });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`\n  ⚠ ${msg}\n`);
      if (err instanceof NexusError && err.code === 2) {
        console.log('  Run "/exit" then "nexus-cli setup" to configure a provider.\n');
      }
      history.pop();
    }
  }
  rl.close();
}

// ─── Main ─────────────────────────────────────────────
async function main(): Promise<void> {
  if (values.help) {
    printHelp();
    process.exit(0);
  }
  if (values.version) {
    console.log(`nexus-cli v${VERSION}`);
    process.exit(0);
  }

  const command = positionals[0];
  ensureConfig();
  const config = loadConfig();
  const keys = loadKeys();

  if (command === 'setup') {
    await runSetup();
    process.exit(0);
  }
  if (command === 'serve') {
    await runServe(config, keys);
    return; // server keeps the process alive
  }

  if (isHeadlessMode()) {
    await runHeadless(config, keys);
  } else {
    await runTUI(config, keys);
    process.exit(0);
  }
}

process.on('SIGINT', () => process.exit(5));

main().catch((err) => {
  exitFromError(err);
});
