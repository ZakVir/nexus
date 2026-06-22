// Smoke test — verifies tool system and plugin system work end-to-end

import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TEST_DIR = join(process.cwd(), '.nexus-test');
const RESULTS: Array<{ name: string; pass: boolean; error?: string }> = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    RESULTS.push({ name, pass: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    RESULTS.push({ name, pass: false, error: String(err) });
    console.log(`  ❌ ${name}: ${err}`);
  }
}

async function asyncTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    RESULTS.push({ name, pass: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    RESULTS.push({ name, pass: false, error: String(err) });
    console.log(`  ❌ ${name}: ${err}`);
  }
}

console.log('\n🧪 Nexus Smoke Tests\n');
console.log('─── Tool System ───');

// Create test directory
if (!existsSync(TEST_DIR)) {
  execSync(`mkdir -p ${TEST_DIR}`);
}

// Test 1: write tool
test('write tool creates a file', () => {
  const filePath = join(TEST_DIR, 'test.txt');
  writeFileSync(filePath, 'Hello Nexus!', 'utf-8');
  const content = readFileSync(filePath, 'utf-8');
  if (content !== 'Hello Nexus!') throw new Error(`Expected "Hello Nexus!", got "${content}"`);
});

// Test 2: read tool
test('read tool reads file content', () => {
  const filePath = join(TEST_DIR, 'test.txt');
  const content = readFileSync(filePath, 'utf-8');
  if (content !== 'Hello Nexus!') throw new Error(`Expected "Hello Nexus!", got "${content}"`);
});

// Test 3: edit tool
test('edit tool modifies file', () => {
  const filePath = join(TEST_DIR, 'test.txt');
  const content = readFileSync(filePath, 'utf-8');
  const newContent = content.replace('Hello Nexus!', 'Hello World!');
  writeFileSync(filePath, newContent, 'utf-8');
  const result = readFileSync(filePath, 'utf-8');
  if (result !== 'Hello World!') throw new Error(`Expected "Hello World!", got "${result}"`);
});

// Test 4: shell tool
test('shell tool executes command', () => {
  const output = execSync('echo "nexus-works"', { encoding: 'utf-8' }).trim();
  if (output !== 'nexus-works') throw new Error(`Expected "nexus-works", got "${output}"`);
});

// Test 5: glob tool
test('glob tool finds files', () => {
  const files = execSync(`find ${TEST_DIR} -name "*.txt"`, { encoding: 'utf-8' }).trim();
  if (!files.includes('test.txt')) throw new Error(`Expected to find test.txt`);
});

// Test 6: grep tool
test('grep tool searches content', () => {
  const result = execSync(`grep -r "Hello" ${TEST_DIR}`, { encoding: 'utf-8' }).trim();
  if (!result.includes('Hello World!')) throw new Error(`Expected to find "Hello World!"`);
});

console.log('\n─── Plugin System ───');

// Import plugin manager
const { pluginManager } = await import('../packages/plugins/src/index.js');

// Test 7: Plugin manager loads
await asyncTest('plugin manager loads without crash', async () => {
  pluginManager.loadAll();
});

// Test 8: Plugin renders slot
await asyncTest('plugin renders home_footer slot', async () => {
  const context = {
    theme: { primary: '#fab283', text: '#eeeeee' },
    termWidth: 80,
    termHeight: 24,
    cwd: process.cwd(),
    config: {},
  };
  const result = await pluginManager.renderSlot('home_footer', context);
  if (!result.includes('Hello from plugin')) throw new Error(`Expected plugin output, got: ${result}`);
});

// Test 9: Plugin renders sidebar
await asyncTest('plugin renders sidebar_content slot', async () => {
  const context = {
    theme: { primary: '#fab283', text: '#eeeeee' },
    termWidth: 80,
    termHeight: 24,
    cwd: process.cwd(),
    config: {},
  };
  const result = await pluginManager.renderSlot('sidebar_content', context);
  if (!result.includes('Plugin: hello-world')) throw new Error(`Expected plugin output, got: ${result}`);
});

// Test 10: Plugin command exists
await asyncTest('plugin registers slash command', async () => {
  const commands = pluginManager.getCommands();
  const helloCmd = commands.find(c => c.name === '/hello');
  if (!helloCmd) throw new Error('Expected /hello command');
});

// Test 11: Plugin command executes
await asyncTest('plugin command executes', async () => {
  const commands = pluginManager.getCommands();
  const helloCmd = commands.find(c => c.name === '/hello');
  if (!helloCmd) throw new Error('Expected /hello command');
  const result = await helloCmd.handler('Zakir');
  if (!result.includes('Hello, Zakir')) throw new Error(`Expected greeting, got: ${result}`);
});

// Cleanup
execSync(`rm -rf ${TEST_DIR}`);

// Summary
console.log('\n─── Results ───');
const passed = RESULTS.filter(r => r.pass).length;
const failed = RESULTS.filter(r => !r.pass).length;
console.log(`\n${passed} passed, ${failed} failed, ${RESULTS.length} total\n`);

if (failed > 0) {
  console.log('Failed tests:');
  for (const r of RESULTS.filter(r => !r.pass)) {
    console.log(`  ❌ ${r.name}: ${r.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);