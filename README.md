# Nexus — Multi-Model AI CLI Tool

> **Dual-audience CLI for humans and AI agents.** Rich terminal UI for interactive use, structured JSON output for agent automation.

[![npm version](https://img.shields.io/npm/v/@nexus-ai/nexus)](https://www.npmjs.com/package/@nexus-ai/nexus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What Is Nexus?

Nexus is a CLI tool that works equally well for:

- **Humans** — Rich terminal UI (TUI) with OpenCode-style layout, themes, sidebar, command palette
- **AI Agents** — Structured JSON output via `--json`, `--pipe`, `--oneshot` flags for subprocess automation

## Features

| Feature | Description |
|---------|-------------|
| **3 Operating Modes** | Single Model, Multi-Model (orchestrator + agents), Full Conversational (panel discussion) |
| **32+ Providers** | Anthropic, OpenRouter, NVIDIA, OpenAI, Google, Groq, Mistral, Cohere, Ollama, and more |
| **11 Tools** | read, write, edit, shell, glob, grep, web_fetch, web_search, todo_write, model_route, group_discuss |
| **Theme System** | 30+ themes, OpenCode-compatible JSON schema, custom themes via `~/.nexus/themes/` |
| **Plugin System** | 7 slot surfaces, custom slash commands, custom tools, MCP server declarations |
| **Session Persistence** | SQLite-backed with sessions, messages, and message parts tables |
| **MCP Server Mode** | `nexus serve --mcp` exposes models as MCP tools |
| **AI-Agent Compatible** | `--version`, `--help`, `--pipe`, `--json`, `--oneshot`, `NEXUS_HEADLESS=1`, `--no-color` |

## Quick Start

```bash
# Install
npm install -g @nexus-ai/nexus

# Or via curl
curl -fsSL https://raw.githubusercontent.com/ZakVir/nexus/main/scripts/install.sh | bash

# Or via Homebrew
brew install zakvir/tap/nexus

# Launch TUI
nexus

# Run setup wizard
nexus setup

# Quick query (AI agent use)
nexus --oneshot --prompt "What does this function do?" --json

# Pipe prompt
echo "Refactor this file" | nexus --pipe

# Start MCP server
nexus serve --mcp
```

## Installation Methods

### npm / npx
```bash
npm install -g @nexus-ai/nexus
npx @nexus-ai/nexus
```

### Homebrew (macOS / Linux)
```bash
brew install nexus-ai/tap/nexus
```

### curl Installer
```bash
curl -fsSL https://raw.githubusercontent.com/nexus-ai/nexus/main/scripts/install.sh | bash
```

### pip (Python shim)
```bash
pip install nexus-cli
```

## Project Structure

```
nexus/
├── packages/
│   ├── core/          # Provider registry, config, project name generator
│   ├── tui/           # Terminal UI (SolidJS + OpenTUI renderer)
│   ├── headless/      # Pipe mode, JSON mode, --print mode
│   ├── agent/         # Orchestrator, conversational group, multi-model runner
│   ├── tools/         # 11 tools with MCP-compatible JSON schemas
│   ├── plugins/       # Slot-based plugin architecture
│   └── cli/           # Entry point, arg parsing, surface detection
├── themes/            # JSON theme files (OpenCode-compatible schema)
├── scripts/           # Install scripts, Homebrew formula, pip shim
├── bin/nexus          # CLI entry point
└── ~/.nexus/
    ├── config.json    # Providers, models, project name, preferences
    ├── keys.json      # Encrypted API keys (chmod 600)
    ├── sessions/      # SQLite session store
    └── plugins/       # User plugins
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--prompt TEXT` | Prompt to send (instead of interactive input) |
| `--pipe` | Read prompt from stdin |
| `--print` | Non-interactive, print output to stdout |
| `--json` | Output as newline-delimited JSON events |
| `--oneshot` | Run prompt, print result, exit (no session persistence) |
| `--model ID` | Model ID to use (overrides config) |
| `--provider ID` | Provider to use |
| `--mode MODE` | `single` \| `multi` \| `conversational` |
| `--session ID` | Resume a named session |
| `--no-color` | Strip ANSI (implied when not a TTY) |
| `--timeout N` | Seconds before abort (default: 120) |
| `--max-tokens N` | Override max tokens |
| `--system TEXT` | Override system prompt |
| `--output-format` | `text` \| `json` \| `markdown` (default: `text`) |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error (missing API key, bad model ID) |
| 3 | Provider error (API returned error) |
| 4 | Timeout |
| 5 | Interrupted (Ctrl+C or SIGINT) |

## Operating Modes

### Single Model
Standard one-model coding session. Full tool access, session history persisted to SQLite.

### Multi-Model (Orchestrator + Agents)
One orchestrator model coordinates specialist agents:

| Role | Purpose |
|------|---------|
| Orchestrator | Decomposes tasks, routes to agents, synthesizes final output |
| Coder | Generates and edits code |
| Researcher | Browses web, reads files, gathers context |
| Reviewer | Critiques output, checks for bugs |
| Designer | Focuses on UI/UX |
| Analyst | Data analysis, metrics, research summaries |

### Full Conversational
All configured models participate as peers in a group discussion. The orchestrator runs last and synthesizes.

## Provider Selection

Nexus supports 32+ providers including:

- **Nous Portal** — 300+ models with bundled tool use
- **OpenRouter** — 700+ models via single API key
- **Anthropic** — Claude models (Opus, Sonnet, Haiku)
- **OpenAI** — GPT-4.1, o3, Codex
- **Google** — Gemini 3.x, Flash
- **NVIDIA** — Nemotron models via NIM
- **DeepSeek** — V3, R1, coder
- **And 25+ more** — Groq, Mistral, Cohere, Ollama, and custom endpoints

## Theme System

Themes use an identical JSON schema to OpenCode. Built-in themes include:

- `nexus` — Default dark theme (warm charcoal + amber primary)
- `nexus-light` — Light variant
- All 30+ OpenCode themes (catppuccin, dracula, gruvbox, kanagawa, nord, one-dark, tokyo-night, etc.)

Custom themes: place JSON files in `~/.nexus/themes/`.

## Plugin System

Plugins are TypeScript/JavaScript files in `~/.nexus/plugins/` that export a manifest.

### Slot Surfaces

| Slot | Where it renders |
|------|-----------------|
| `home_logo` | Replaces the Nexus logo on the home screen |
| `home_prompt` | Replaces or wraps the home prompt box |
| `home_footer` | Adds content below the home prompt |
| `sidebar_title` | Replaces the session title in the sidebar |
| `sidebar_content` | Adds sections to the sidebar |
| `session_prompt` | Replaces or wraps the session prompt |
| `session_prompt_right` | Adds controls to the right of the prompt |

### Plugin Capabilities

- Custom slash commands (`/my-command`)
- Custom tools (exposed to AI models)
- Custom themes (auto-loaded from `~/.nexus/themes/`)
- Custom MCP servers (declared in plugin manifest)

## Session Management

Sessions are stored in SQLite at `~/.nexus/sessions/nexus.db`.

### Commands

| Command | Action |
|---------|--------|
| `Ctrl+X n` | New session |
| `Ctrl+X l` | Session list (fuzzy searchable) |
| `Ctrl+R` | Rename session |
| `/fork` | Fork session from current message |
| `/compact` | Summarize session to reduce context |
| `/export` | Export session as Markdown |
| `/timeline` | Jump to any message |

### Auto-Compact

When context exceeds 80% of the model's context window, Nexus offers to compact automatically.

## Tool System

### Standard Tools

| Tool | Description |
|------|-------------|
| `read` | Read file contents with line numbers |
| `write` | Write file to disk (auto-creates directories) |
| `edit` | Targeted find-and-replace in files |
| `shell` | Execute shell commands with timeout |
| `glob` | Find files by pattern |
| `grep` | Search file contents by regex |
| `web_fetch` | Fetch URL contents |
| `web_search` | Search the web |
| `todo_write` | Maintain a todo list |

### Nexus-Specific Tools

| Tool | Description |
|------|-------------|
| `model_route` | Route a sub-task to a specific model by ID or role |
| `group_discuss` | Broadcast a prompt to all models in conversational mode |

## Configuration

`~/.nexus/config.json`:

```json
{
  "project_name": "Iron Falcon",
  "version": "1",
  "mode": "single",
  "theme": "nexus",
  "providers": {
    "anthropic": { "enabled": true },
    "openrouter": { "enabled": true }
  },
  "models": {
    "openrouter": [
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "deepseek/deepseek-v4-flash"
    ]
  },
  "model_aliases": {
    "deepseek/deepseek-v4-flash": "DS Flash"
  },
  "agents": {
    "orchestrator": { "model": "xiaomi/mimo-v2.5", "provider": "openrouter" },
    "coder": { "model": "deepseek/deepseek-v4-flash", "provider": "openrouter" }
  },
  "conversational": {
    "models": ["nvidia/nemotron-3-ultra-550b-a55b:free", "deepseek/deepseek-v4-flash"],
    "orchestrator": "xiaomi/mimo-v2.5",
    "parallel": true
  },
  "keybinds": { "leader": "ctrl+x" },
  "tui": { "prompt_max_width": "auto", "sidebar": "auto" },
  "headless": { "default_output": "json", "timeout": 120 }
}
```

API keys stored separately in `~/.nexus/keys.json` (chmod 600).

## JSON Event Stream (Headless Mode)

When `--json` is set, events are emitted as newline-delimited JSON (NDJSON):

```jsonc
{"type":"session.start","session_id":"sess_01","model":"deepseek/deepseek-v4-flash","mode":"single","project":"Iron Falcon","ts":1719000000000}
{"type":"content.delta","session_id":"sess_01","text":"Here is a summary...\n","model":"deepseek/deepseek-v4-flash","ts":1719000000200}
{"type":"tool.start","session_id":"sess_01","tool":"read","input":{"filePath":"src/app.tsx"},"ts":1719000000300}
{"type":"tool.done","session_id":"sess_01","tool":"read","output":"import React...","ts":1719000000400}
{"type":"content.done","session_id":"sess_01","text":"Full response...","model":"deepseek/deepseek-v4-flash","tokens":{"input":1240,"output":387},"duration_ms":2340,"ts":1719000000500}
{"type":"session.end","session_id":"sess_01","ts":1719000000510}
```

## Keybinds

| Keybind | Action |
|---------|--------|
| `Ctrl+C` / `Ctrl+D` | Exit |
| `Ctrl+P` | Command palette |
| `Ctrl+M` | Cycle model |
| `Esc` | Interrupt / cancel / close dialog |
| `Ctrl+X b` | Toggle sidebar |
| `Ctrl+X t` | Theme picker |
| `Ctrl+X n` | New session |
| `Ctrl+X l` | Session list |
| `Ctrl+X m` | Mode switcher |
| `Ctrl+X s` | Status (providers, MCP, LSP) |
| `Ctrl+X g` | Jump to message (timeline) |
| `Ctrl+X c` | Compact session |
| `Ctrl+R` | Rename session |
| `/` prefix | Slash commands |
| `?` | Which-key popup |

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test

# Type check
bun run typecheck

# Run smoke tests
bun run scripts/smoke-test.ts

# Run compatibility tests
bash scripts/pass1-compat.sh
bun run scripts/pass2-fidelity.ts
```

## License

MIT