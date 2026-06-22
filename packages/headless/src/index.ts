// Headless interface — NDJSON event stream, --print, --pipe, --oneshot

export interface HeadlessOptions {
  prompt?: string;
  pipe?: boolean;
  print?: boolean;
  json?: boolean;
  oneshot?: boolean;
  model?: string;
  provider?: string;
  mode?: 'single' | 'multi' | 'conversational';
  sessionId?: string;
  noColor?: boolean;
  timeout?: number;
  maxTokens?: number;
  system?: string;
  outputFormat?: 'text' | 'json' | 'markdown';
}

export type EventType =
  | 'session.start'
  | 'thinking'
  | 'content.delta'
  | 'tool.start'
  | 'tool.done'
  | 'content.done'
  | 'session.end'
  | 'model.start'
  | 'model.done'
  | 'synthesis.start'
  | 'synthesis.done'
  | 'error';

export interface BaseEvent {
  type: EventType;
  session_id: string;
  ts: number;
}

export interface SessionStartEvent extends BaseEvent {
  type: 'session.start';
  model: string;
  mode: string;
  project: string;
}

export interface ThinkingEvent extends BaseEvent {
  type: 'thinking';
  text: string;
}

export interface ContentDeltaEvent extends BaseEvent {
  type: 'content.delta';
  text: string;
  model?: string;
  role?: string;
}

export interface ToolStartEvent extends BaseEvent {
  type: 'tool.start';
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolDoneEvent extends BaseEvent {
  type: 'tool.done';
  tool: string;
  output: string;
}

export interface ContentDoneEvent extends BaseEvent {
  type: 'content.done';
  text: string;
  model: string;
  tokens?: { input: number; output: number };
  duration_ms?: number;
}

export interface SessionEndEvent extends BaseEvent {
  type: 'session.end';
}

export interface ModelStartEvent extends BaseEvent {
  type: 'model.start';
  model: string;
  role?: string;
}

export interface ModelDoneEvent extends BaseEvent {
  type: 'model.done';
  model: string;
  role?: string;
}

export interface SynthesisStartEvent extends BaseEvent {
  type: 'synthesis.start';
  model: string;
  role?: string;
}

export interface SynthesisDoneEvent extends BaseEvent {
  type: 'synthesis.done';
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  message: string;
  code?: number;
}

export type HeadlessEvent =
  | SessionStartEvent
  | ThinkingEvent
  | ContentDeltaEvent
  | ToolStartEvent
  | ToolDoneEvent
  | ContentDoneEvent
  | SessionEndEvent
  | ModelStartEvent
  | ModelDoneEvent
  | SynthesisStartEvent
  | SynthesisDoneEvent
  | ErrorEvent;

/**
 * Emit a single NDJSON event to stdout.
 */
export function emitEvent(event: HeadlessEvent): void {
  process.stdout.write(JSON.stringify(event) + '\n');
}

/**
 * Emit a session start event.
 */
export function emitSessionStart(
  sessionId: string,
  model: string,
  mode: string,
  project: string
): void {
  emitEvent({
    type: 'session.start',
    session_id: sessionId,
    model,
    mode,
    project,
    ts: Date.now(),
  });
}

/**
 * Emit a thinking event.
 */
export function emitThinking(sessionId: string, text: string): void {
  emitEvent({
    type: 'thinking',
    session_id: sessionId,
    text,
    ts: Date.now(),
  });
}

/**
 * Emit a content delta event (partial content).
 */
export function emitContentDelta(
  sessionId: string,
  text: string,
  model?: string,
  role?: string
): void {
  emitEvent({
    type: 'content.delta',
    session_id: sessionId,
    text,
    model,
    role,
    ts: Date.now(),
  });
}

/**
 * Emit a tool start event.
 */
export function emitToolStart(
  sessionId: string,
  tool: string,
  input: Record<string, unknown>
): void {
  emitEvent({
    type: 'tool.start',
    session_id: sessionId,
    tool,
    input,
    ts: Date.now(),
  });
}

/**
 * Emit a tool done event.
 */
export function emitToolDone(
  sessionId: string,
  tool: string,
  output: string
): void {
  emitEvent({
    type: 'tool.done',
    session_id: sessionId,
    tool,
    output,
    ts: Date.now(),
  });
}

/**
 * Emit a content done event (final response).
 */
export function emitContentDone(
  sessionId: string,
  text: string,
  model: string,
  tokens?: { input: number; output: number },
  durationMs?: number
): void {
  emitEvent({
    type: 'content.done',
    session_id: sessionId,
    text,
    model,
    tokens,
    duration_ms: durationMs,
    ts: Date.now(),
  });
}

/**
 * Emit a session end event.
 */
export function emitSessionEnd(sessionId: string): void {
  emitEvent({
    type: 'session.end',
    session_id: sessionId,
    ts: Date.now(),
  });
}

/**
 * Emit an error event.
 */
export function emitError(
  sessionId: string,
  message: string,
  code?: number
): void {
  emitEvent({
    type: 'error',
    session_id: sessionId,
    message,
    code,
    ts: Date.now(),
  });
}

/**
 * Emit a model start event (for multi-model/conversational modes).
 */
export function emitModelStart(
  sessionId: string,
  model: string,
  role?: string
): void {
  emitEvent({
    type: 'model.start',
    session_id: sessionId,
    model,
    role,
    ts: Date.now(),
  });
}

/**
 * Emit a model done event.
 */
export function emitModelDone(
  sessionId: string,
  model: string,
  role?: string
): void {
  emitEvent({
    type: 'model.done',
    session_id: sessionId,
    model,
    role,
    ts: Date.now(),
  });
}

/**
 * Emit a synthesis start event (orchestrator starting).
 */
export function emitSynthesisStart(
  sessionId: string,
  model: string,
  role?: string
): void {
  emitEvent({
    type: 'synthesis.start',
    session_id: sessionId,
    model,
    role,
    ts: Date.now(),
  });
}

/**
 * Emit a synthesis done event.
 */
export function emitSynthesisDone(sessionId: string): void {
  emitEvent({
    type: 'synthesis.done',
    session_id: sessionId,
    ts: Date.now(),
  });
}

/**
 * Read prompt from stdin (--pipe mode).
 */
export function readPromptFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', reject);
    process.stdin.resume();
  });
}

/**
 * Determine if we should use headless mode.
 */
export function isHeadlessMode(options: {
  print?: boolean;
  json?: boolean;
  pipe?: boolean;
  oneshot?: boolean;
}): boolean {
  if (options.print || options.json || options.pipe || options.oneshot) return true;
  if (process.env.NEXUS_HEADLESS === '1') return true;
  if (!process.stdout.isTTY) return true;
  return false;
}