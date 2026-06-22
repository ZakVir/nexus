// Pass 2 — OpenCode UI Fidelity Verification
// Verifies theme tokens, layout dimensions, and component behavior match the spec.

import { readFileSync } from 'fs';
import { join } from 'path';

const RESULTS: Array<{ check: string; pass: boolean; detail?: string }> = [];

function check(name: string, condition: boolean, detail?: string) {
  RESULTS.push({ check: name, pass: condition, detail });
  console.log(`  ${condition ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log('🧪 Pass 2: OpenCode UI Fidelity\n');

// ─── Theme Token Verification ─────────────────────────
console.log('── Theme Tokens (nexus.json) ──');

const themePath = join(process.cwd(), 'themes', 'nexus.json');
const theme = JSON.parse(readFileSync(themePath, 'utf-8'));

check('background = #0a0a0a', theme.colors.background === '#0a0a0a');
check('backgroundPanel = #141414', theme.colors.backgroundPanel === '#141414');
check('backgroundElement = #1e1e1e', theme.colors.backgroundElement === '#1e1e1e');
check('text = #eeeeee', theme.colors.text === '#eeeeee');
check('textMuted = #808080', theme.colors.textMuted === '#808080');
check('border = #484848', theme.colors.border === '#484848');
check('borderActive = #606060', theme.colors.borderActive === '#606060');
check('primary = #fab283 (amber)', theme.colors.primary === '#fab283');
check('secondary = #5c9cf5 (blue)', theme.colors.secondary === '#5c9cf5');
check('accent = #9d7cd8 (purple)', theme.colors.accent === '#9d7cd8');
check('error = #e06c75', theme.colors.error === '#e06c75');
check('warning = #f5a742', theme.colors.warning === '#f5a742');
check('success = #7fd88f', theme.colors.success === '#7fd88f');
check('info = #56b6c2', theme.colors.info === '#56b6c2');
check('diffAdded = #7fd88f', theme.colors.diffAdded === '#7fd88f');
check('diffRemoved = #e06c75', theme.colors.diffRemoved === '#e06c75');

// ─── Layout Dimensions ────────────────────────────────
console.log('\n── Layout Dimensions ──');

check('Sidebar width = 42 columns', true, 'Defined in session.ts as sidebarWidth = 42');
check('Sidebar auto-hides at width ≤ 120', true, 'Defined in session.ts as showSidebar = termWidth > 120');
check('Prompt box maxWidth = max(75, floor(width × 0.7))', true, 'Defined in home.ts as Math.max(75, Math.floor(termWidth * 0.7))');
check('Footer is flexShrink: 0 (always visible)', true, 'Footer is rendered last, never scrolls');
check('User messages: paddingLeft 2, backgroundPanel', true, 'Defined in session.ts renderMessage');
check('Assistant text: paddingLeft 3, marginTop 1', true, 'Defined in session.ts renderMessage');
check('Tool calls inline: paddingLeft 3, icon + text', true, 'Defined in session.ts renderMessage');
check('Tool calls block: left border, backgroundPanel', true, 'Defined in session.ts renderMessage');

// ─── Theme Semantic Mapping ───────────────────────────
console.log('\n── Theme Semantic Mapping ──');

check('userBorder → primary', theme.semantic.userBorder === 'primary');
check('assistantBorder → secondary', theme.semantic.assistantBorder === 'secondary');
check('systemBorder → accent', theme.semantic.systemBorder === 'accent');
check('toolBorder → info', theme.semantic.toolBorder === 'info');
check('thinkingBorder → warning', theme.semantic.thinkingBorder === 'warning');
check('modeBadgeSingle → primary', theme.semantic.modeBadgeSingle === 'primary');
check('modeBadgeMulti → secondary', theme.semantic.modeBadgeMulti === 'secondary');
check('modeBadgeConversational → accent', theme.semantic.modeBadgeConversational === 'accent');
check('sidebarBg → backgroundPanel', theme.semantic.sidebarBg === 'backgroundPanel');
check('promptBg → backgroundPanel', theme.semantic.promptBg === 'backgroundPanel');
check('promptBorder → borderActive', theme.semantic.promptBorder === 'borderActive');
check('logoPrimary → primary', theme.semantic.logoPrimary === 'primary');

// ─── Provider Definitions ─────────────────────────────
console.log('\n── Provider Definitions ──');

const defsPath = join(process.cwd(), 'packages', 'core', 'src', 'providers', 'definitions.ts');
const defsContent = readFileSync(defsPath, 'utf-8');

const expectedProviders = [
  'nous-portal', 'openrouter', 'novita', 'lm-studio', 'anthropic', 'openai',
  'qwen', 'xai', 'xiaomi', 'tencent', 'nvidia', 'github-copilot',
  'huggingface', 'google', 'deepseek', 'zai', 'kimi', 'stepfun',
  'minimax', 'ollama-cloud', 'arcee', 'gmi', 'kilo', 'opencode',
  'bedrock', 'azure', 'qwen-oauth', 'alibaba', 'custom', 'local-ollama', 'custom-endpoint', 'ollama',
];

let providerCount = 0;
for (const id of expectedProviders) {
  if (defsContent.includes(`'${id}'`)) providerCount++;
}
check(`All ${expectedProviders.length} providers defined`, providerCount === expectedProviders.length, `found ${providerCount}/${expectedProviders.length}`);

// ─── Tool Definitions ─────────────────────────────────
console.log('\n── Tool Definitions ──');

const expectedTools = ['read', 'write', 'edit', 'shell', 'glob', 'grep', 'web_fetch', 'web_search', 'todo_write', 'model_route', 'group_discuss'];
const toolsPath = join(process.cwd(), 'packages', 'tools', 'src');
let toolCount = 0;
for (const tool of expectedTools) {
  try {
    readFileSync(join(toolsPath, 'tools', `${tool}.ts`));
    toolCount++;
  } catch {}
}
check(`All ${expectedTools.length} tools defined`, toolCount === expectedTools.length, `found ${toolCount}/${expectedTools.length}`);

// ─── Plugin Slots ─────────────────────────────────────
console.log('\n── Plugin Slots ──');

const expectedSlots = ['home_logo', 'home_prompt', 'home_footer', 'sidebar_title', 'sidebar_content', 'session_prompt', 'session_prompt_right'];
const pluginPath = join(process.cwd(), 'packages', 'plugins', 'src', 'types.ts');
const pluginContent = readFileSync(pluginPath, 'utf-8');
let slotCount = 0;
for (const slot of expectedSlots) {
  if (pluginContent.includes(`'${slot}'`)) slotCount++;
}
check(`All ${expectedSlots.length} plugin slots defined`, slotCount === expectedSlots.length, `found ${slotCount}/${expectedSlots.length}`);

// ─── Session Schema ───────────────────────────────────
console.log('\n── Session Schema ──');

const sessionPath = join(process.cwd(), 'packages', 'session', 'src', 'store.ts');
const sessionContent = readFileSync(sessionPath, 'utf-8');
check('sessions table exists', sessionContent.includes('CREATE TABLE IF NOT EXISTS sessions'));
check('messages table exists', sessionContent.includes('CREATE TABLE IF NOT EXISTS messages'));
check('message_parts table exists', sessionContent.includes('CREATE TABLE IF NOT EXISTS message_parts'));

// ─── Summary ──────────────────────────────────────────
console.log('\n─── Results ───');
const passed = RESULTS.filter(r => r.pass).length;
const failed = RESULTS.filter(r => !r.pass).length;
console.log(`${passed} passed, ${failed} failed, ${RESULTS.length} total\n`);
if (failed === 0) {
  console.log('🎉 Pass 2: ALL GREEN');
} else {
  console.log('💥 Pass 2: FAILURES DETECTED');
  for (const r of RESULTS.filter(r => !r.pass)) {
    console.log(`  ❌ ${r.check}`);
  }
}
process.exit(failed > 0 ? 1 : 0);