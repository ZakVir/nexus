// Setup wizard — orchestrates all setup screens

import { renderWelcomeScreen } from './components/welcome-screen.js';
import { renderProviderSelector } from './components/provider-selector.js';
import { renderApiKeyEntry } from './components/api-key-entry.js';
import { renderModelListInput } from './components/model-list-input.js';
import { generateProjectName, PROVIDER_DEFS } from '@nexus-ai/core';
import { ansi } from './utils/ansi.js';
import type { Theme } from './theme/index.js';
import { defaultTheme } from './theme/index.js';

const VERSION = '0.1.0';

export interface SetupResult {
  project_name: string;
  providers: Record<string, { enabled: boolean; api_key?: string }>;
  models: Record<string, string[]>;
  theme: string;
}

/**
 * Run the full setup wizard.
 * Returns the complete configuration.
 */
export async function runSetupWizard(theme: Theme = defaultTheme): Promise<SetupResult> {
  const c = theme.colors;
  const projectName = generateProjectName();
  
  const result: SetupResult = {
    project_name: projectName,
    providers: {},
    models: {},
    theme: 'nexus',
  };

  // ─── Step 1: Welcome ────────────────────────────────────
  console.log(`\n${c.primary}  Starting Nexus setup wizard...${ansi.reset}`);
  await renderWelcomeScreen(projectName, VERSION, theme);

  // ─── Step 2: Provider Selection ─────────────────────────
  console.log(`\n${c.primary}  Step 1/4: Select providers${ansi.reset}`);
  const providerResult = await renderProviderSelector(theme);
  
  if (providerResult.leaveUnchanged) {
    console.log(`\n${c.success}  Leaving configuration unchanged.${ansi.reset}`);
    return result;
  }
  
  // Mark selected providers
  for (const providerId of providerResult.selectedProviders) {
    result.providers[providerId] = { enabled: true };
  }

  // ─── Step 3: API Keys ──────────────────────────────────
  console.log(`\n${c.primary}  Step 2/4: Enter API keys${ansi.reset}`);
  
  for (const providerId of providerResult.selectedProviders) {
    const def = PROVIDER_DEFS.find(p => p.id === providerId);
    if (!def || !def.requiresKey) continue;
    
    const keyResult = await renderApiKeyEntry(providerId, theme);
    if (!keyResult.skipped && keyResult.key) {
      result.providers[providerId].api_key = keyResult.key;
    }
  }

  // ─── Step 4: Model List Configuration ───────────────────
  console.log(`\n${c.primary}  Step 3/4: Configure model lists${ansi.reset}`);
  
  const configureModels = await promptYesNo('Would you like to configure your model list?', theme);
  
  if (configureModels) {
    for (const providerId of providerResult.selectedProviders) {
      const def = PROVIDER_DEFS.find(p => p.id === providerId);
      if (!def) continue;
      
      const modelResult = await renderModelListInput(providerId, [], theme);
      if (!modelResult.cancelled && modelResult.models.length > 0) {
        result.models[providerId] = modelResult.models;
      }
    }
  }

  // ─── Step 5: Project Name ───────────────────────────────
  console.log(`\n${c.primary}  Step 4/4: Project name${ansi.reset}`);
  const customName = await promptTextInput('Your Nexus project name', projectName, theme);
  if (customName.trim()) {
    result.project_name = customName.trim();
  }

  // ─── Complete ───────────────────────────────────────────
  console.log(`\n${c.success}  Setup complete ✓${ansi.reset}`);
  console.log(`\n  Providers configured:  ${Object.keys(result.providers).join(', ')}`);
  console.log(`  Models available:      ${Object.values(result.models).flat().length}`);
  console.log(`  Project name:          ${result.project_name}`);
  console.log(`\n  Run ${c.primary}nexus${ansi.reset} in this directory to open the session interface.`);
  console.log(`  Run ${c.primary}nexus --help${ansi.reset} to see all commands and flags.`);
  
  return result;
}

/** Simple yes/no prompt */
async function promptYesNo(question: string, theme: Theme): Promise<boolean> {
  const c = theme.colors;
  const termWidth = process.stdout.columns || 80;
  
  const out: string[] = [];
  out.push(ansi.altScreen);
  out.push(ansi.clearScreen);
  out.push(ansi.moveTo(0, 0));
  out.push(ansi.hideCursor);
  
  out.push(`\n  ${ansi.fgHex(c.text)}${question}${ansi.reset}\n\n`);
  out.push(ansi.fgHex(c.borderSubtle));
  out.push('─'.repeat(60));
  out.push(ansi.reset);
  out.push('\n\n');
  
  out.push(`  ${ansi.fgHex(c.primary)}●${ansi.reset} No  — use the full list from each provider (recommended)\n`);
  out.push(`  ${ansi.fgHex(c.textMuted)}○${ansi.reset} Yes — paste exact model IDs for each provider\n`);
  out.push('\n');
  out.push(ansi.fgHex(c.textMuted));
  out.push('  Enter to confirm');
  out.push(ansi.reset);
  
  process.stdout.write(out.join(''));
  
  return new Promise<boolean>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    
    let selected = false; // false = No, true = Yes
    
    const onData = (data: string) => {
      if (data === '\x1b[A' || data === '\x1b[B') {
        selected = !selected;
        // Re-render
        process.stdout.write(ansi.altScreen + ansi.clearScreen + ansi.moveTo(0, 0));
        const out2: string[] = [];
        out2.push(`\n  ${ansi.fgHex(c.text)}${question}${ansi.reset}\n\n`);
        out2.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(60) + ansi.reset + '\n\n');
        out2.push(`  ${ansi.fgHex(selected ? c.textMuted : c.primary)}${selected ? '○' : '●'}${ansi.reset} No  — use the full list from each provider (recommended)\n`);
        out2.push(`  ${ansi.fgHex(selected ? c.primary : c.textMuted)}${selected ? '●' : '○'}${ansi.reset} Yes — paste exact model IDs for each provider\n`);
        out2.push('\n');
        out2.push(ansi.fgHex(c.textMuted) + '  Enter to confirm' + ansi.reset);
        process.stdout.write(out2.join(''));
        return;
      }
      
      if (data === '\r' || data === '\n') {
        cleanup();
        resolve(selected);
        return;
      }
      if (data === '\x03') process.exit(0);
    };
    
    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(ansi.showCursor + ansi.normalScreen);
    }
    
    process.stdin.on('data', onData);
  });
}

/** Simple text input prompt */
async function promptTextInput(label: string, defaultValue: string, theme: Theme): Promise<string> {
  const c = theme.colors;
  let value = defaultValue;
  
  const out: string[] = [];
  out.push(ansi.altScreen);
  out.push(ansi.clearScreen);
  out.push(ansi.moveTo(0, 0));
  out.push(ansi.hideCursor);
  
  out.push(`\n  ${ansi.fgHex(c.primary)}${ansi.bold}${label}${ansi.reset}\n\n`);
  out.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(60) + ansi.reset + '\n\n');
  out.push(`  Nexus generated a name for this install. You can keep\n`);
  out.push(`  it or type your own.\n\n`);
  out.push(`  ${ansi.fgHex(c.textMuted)}Name:  ${ansi.reset}${ansi.fgHex(c.text)}${defaultValue}${ansi.reset}${ansi.fgHex(c.primary)}█${ansi.reset}\n\n`);
  out.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(60) + ansi.reset + '\n\n');
  out.push(ansi.fgHex(c.textMuted) + '  Enter to confirm  ·  Ctrl+U to clear  ·  Esc to keep generated' + ansi.reset);
  
  process.stdout.write(out.join(''));
  
  return new Promise<string>((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    
    const onData = (data: string) => {
      if (data === '\x03') process.exit(0);
      if (data === '\x1b') { cleanup(); resolve(defaultValue); return; }
      if (data === '\r' || data === '\n') { cleanup(); resolve(value); return; }
      if (data === '\x15') { value = ''; render(); return; }
      if (data === '\x7f' || data === '\x08') { value = value.slice(0, -1); render(); return; }
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        value += data;
        render();
      }
    };
    
    function render() {
      process.stdout.write(ansi.altScreen + ansi.clearScreen + ansi.moveTo(0, 0) + ansi.hideCursor);
      const out2: string[] = [];
      out2.push(`\n  ${ansi.fgHex(c.primary)}${ansi.bold}${label}${ansi.reset}\n\n`);
      out2.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(60) + ansi.reset + '\n\n');
      out2.push(`  Nexus generated a name for this install. You can keep\n`);
      out2.push(`  it or type your own.\n\n`);
      out2.push(`  ${ansi.fgHex(c.textMuted)}Name:  ${ansi.reset}${ansi.fgHex(c.text)}${value}${ansi.reset}${ansi.fgHex(c.primary)}█${ansi.reset}\n\n`);
      out2.push(ansi.fgHex(c.borderSubtle) + '─'.repeat(60) + ansi.reset + '\n\n');
      out2.push(ansi.fgHex(c.textMuted) + '  Enter to confirm  ·  Ctrl+U to clear  ·  Esc to keep generated' + ansi.reset);
      process.stdout.write(out2.join(''));
    }
    
    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(ansi.showCursor + ansi.normalScreen);
    }
    
    process.stdin.on('data', onData);
  });
}