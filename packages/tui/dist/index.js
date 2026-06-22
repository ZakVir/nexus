import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/utils/ansi.ts
var ESC = "\x1B";
var CSI = `${ESC}[`;
var ansi2 = {
  fg: (r, g, b) => `${CSI}38;2;${r};${g};${b}m`,
  bg: (r, g, b) => `${CSI}48;2;${r};${g};${b}m`,
  fgHex: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ansi2.fg(r, g, b);
  },
  bgHex: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ansi2.bg(r, g, b);
  },
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,
  inverse: `${CSI}7m`,
  strikethrough: `${CSI}9m`,
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  saveCursor: `${ESC}7`,
  restoreCursor: `${ESC}8`,
  altScreen: `${ESC}[?1049h`,
  normalScreen: `${ESC}[?1049l`,
  clearScreen: `${CSI}2J`,
  clearLine: `${CSI}2K`,
  clearToEnd: `${CSI}0K`,
  moveTo: (row, col) => `${CSI}${row};${col}H`,
  moveUp: (n = 1) => `${CSI}${n}A`,
  moveDown: (n = 1) => `${CSI}${n}B`,
  moveRight: (n = 1) => `${CSI}${n}C`,
  moveLeft: (n = 1) => `${CSI}${n}D`,
  scrollUp: (n = 1) => `${CSI}${n}S`,
  scrollDown: (n = 1) => `${CSI}${n}T`
};
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, "");
}
function visibleWidth(str) {
  return stripAnsi(str).length;
}
function padOrTruncate(str, targetWidth, align = "left") {
  const visible = visibleWidth(str);
  if (visible >= targetWidth)
    return str;
  const pad = targetWidth - visible;
  const leftPad = align === "right" ? pad : align === "center" ? Math.floor(pad / 2) : 0;
  const rightPad = align === "left" ? pad : align === "center" ? pad - leftPad : 0;
  return " ".repeat(leftPad) + str + " ".repeat(rightPad);
}
function wrapText(text, maxWidth) {
  const lines = [];
  let currentLine = "";
  let currentWidth = 0;
  for (const char of text) {
    if (char === `
`) {
      lines.push(currentLine);
      currentLine = "";
      currentWidth = 0;
      continue;
    }
    if (char === "\x1B") {
      let escEnd = currentLine.length;
      while (escEnd < currentLine.length && currentLine[escEnd] !== "m" && currentLine[escEnd] !== "K") {
        escEnd++;
      }
      currentLine += char;
      continue;
    }
    currentLine += char;
    currentWidth++;
    if (currentWidth >= maxWidth) {
      lines.push(currentLine);
      currentLine = "";
      currentWidth = 0;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
function parseKey(data) {
  const str = data.toString();
  const key = {
    name: "",
    ctrl: false,
    meta: false,
    shift: false,
    sequence: str
  };
  if (str === "\x03") {
    key.name = "c";
    key.ctrl = true;
    return key;
  }
  if (str === "\x04") {
    key.name = "d";
    key.ctrl = true;
    return key;
  }
  if (str === "\x1B") {
    if (str.length === 1) {
      key.name = "escape";
      return key;
    }
    if (str === "\x1B[1;3A") {
      key.name = "up";
      key.meta = true;
      return key;
    }
    if (str === "\x1B[1;3B") {
      key.name = "down";
      key.meta = true;
      return key;
    }
    if (str === "\x1B[A") {
      key.name = "up";
      return key;
    }
    if (str === "\x1B[B") {
      key.name = "down";
      return key;
    }
    if (str === "\x1B[C") {
      key.name = "right";
      return key;
    }
    if (str === "\x1B[D") {
      key.name = "left";
      return key;
    }
    if (str === "\r" || str === `
`) {
      key.name = "return";
      return key;
    }
    if (str === " ") {
      key.name = "space";
      return key;
    }
    if (str === "\t") {
      key.name = "tab";
      return key;
    }
  }
  if (str.length === 1 && str.charCodeAt(0) >= 1 && str.charCodeAt(0) <= 26) {
    key.name = String.fromCharCode(str.charCodeAt(0) + 96);
    key.ctrl = true;
    return key;
  }
  if (str.length === 1) {
    key.name = str;
    return key;
  }
  return key;
}
function formatDuration(ms) {
  if (ms < 1000)
    return `${ms}ms`;
  if (ms < 60000)
    return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor(ms % 60000 / 1000);
  return `${mins}m ${secs}s`;
}
function formatTokens(n) {
  if (n < 1000)
    return `${n}`;
  if (n < 1e6)
    return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}
function truncate(str, maxWidth) {
  const vis = visibleWidth(str);
  if (vis <= maxWidth)
    return str;
  return str.slice(0, maxWidth - 1) + "…";
}

// src/theme/index.ts
function resolveSemanticColors(theme) {
  const { colors, semantic } = theme;
  const resolved = { ...colors };
  for (const [key, value] of Object.entries(semantic)) {
    if (colors[value]) {
      resolved[`semantic.${key}`] = colors[value];
    } else {
      resolved[`semantic.${key}`] = value;
    }
  }
  return resolved;
}
function loadTheme(themeJson) {
  return JSON.parse(themeJson);
}
function loadThemeFile(path) {
  const fs = __require("fs");
  return loadTheme(fs.readFileSync(path, "utf-8"));
}
var defaultTheme = {
  name: "nexus",
  description: "Nexus default theme - warm charcoal with amber primary",
  author: "Nexus Team",
  version: "1.0.0",
  colors: {
    background: "#0a0a0a",
    backgroundPanel: "#141414",
    backgroundElement: "#1e1e1e",
    backgroundElementHover: "#2a2a2a",
    text: "#eeeeee",
    textMuted: "#808080",
    textSubtle: "#505050",
    border: "#484848",
    borderActive: "#606060",
    borderSubtle: "#303030",
    primary: "#fab283",
    secondary: "#5c9cf5",
    accent: "#9d7cd8",
    error: "#e06c75",
    warning: "#f5a742",
    success: "#7fd88f",
    info: "#56b6c2",
    diffAdded: "#7fd88f",
    diffRemoved: "#e06c75",
    diffContext: "#808080",
    selection: "#fab28340",
    cursor: "#fab283",
    overlay: "#0a0a0acc",
    scrollbar: "#303030",
    scrollbarHover: "#484848"
  },
  semantic: {
    userBorder: "primary",
    assistantBorder: "secondary",
    systemBorder: "accent",
    toolBorder: "info",
    thinkingBorder: "warning",
    modeBadgeSingle: "primary",
    modeBadgeMulti: "secondary",
    modeBadgeConversational: "accent",
    sidebarBg: "backgroundPanel",
    promptBg: "backgroundPanel",
    promptBorder: "borderActive",
    footerBg: "background",
    footerText: "textMuted",
    logoPrimary: "primary",
    logoSecondary: "text"
  }
};

// src/components/welcome-screen.ts
function renderLogo(primaryHex, secondaryHex) {
  const lines = [];
  const c = ansi2.fgHex(primaryHex);
  const s = ansi2.fgHex(secondaryHex);
  const r = ansi2.reset;
  lines.push(`${c}███╗  ██╗${r}${s}███████╗${r}${c}██╗  ██╗${r}${s}██╗   ██╗${r}${c}███████╗${r}`);
  lines.push(`${c}████╗ ██║${r}${s}██╔════╝${r}${c}╚██╗██╔╝${r}${s}██║   ██║${r}${c}██╔════╝${r}`);
  lines.push(`${c}██╔██╗██║${r}${s}█████╗${r}${c}   ╚███╔╝ ${r}${s}██║   ██║${r}${c}███████╗${r}`);
  lines.push(`${c}██║╚████║${r}${s}██╔══╝${r}${c}   ██╔██╗ ${r}${s}██║   ██║${r}${c}╚════██║${r}`);
  lines.push(`${c}██║ ╚███║${r}${s}███████╗${r}${c}██╔╝ ██╗${r}${s}╚██████╔╝${r}${c}███████║${r}`);
  lines.push(`${c}╚═╝  ╚══╝${r}${s}╚══════╝${r}${c}╚═╝  ╚═╝ ${r}${s} ╚═════╝ ${r}${c}╚══════╝${r}`);
  return lines;
}
async function renderWelcomeScreen(projectName, version, theme = defaultTheme) {
  const c = theme.colors;
  const termWidth = process.stdout.columns || 80;
  function render() {
    const out = [];
    out.push(ansi2.altScreen);
    out.push(ansi2.clearScreen);
    out.push(ansi2.moveTo(0, 0));
    out.push(ansi2.hideCursor);
    out.push(`
`);
    out.push(`
`);
    const logo = renderLogo(c.primary, c.text);
    for (const line of logo) {
      const lineWidth = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").length;
      const pad = Math.max(0, Math.floor((termWidth - lineWidth) / 2));
      out.push(" ".repeat(pad) + line + `
`);
    }
    const subtitle = `${projectName} · v${version}`;
    const subPad = Math.max(0, Math.floor((termWidth - subtitle.length) / 2));
    out.push(`
`);
    out.push(" ".repeat(subPad) + ansi2.fgHex(c.textMuted) + subtitle + ansi2.reset + `
`);
    out.push(`
`);
    const promptText = "What would you like to do?";
    const boxWidth = Math.min(termWidth - 4, 50);
    const boxPad = Math.max(0, Math.floor((termWidth - boxWidth) / 2));
    out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "╭" + "─".repeat(boxWidth - 2) + "╮" + ansi2.reset + `
`);
    const textPad = Math.max(0, Math.floor((boxWidth - 2 - promptText.length) / 2));
    out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(textPad) + ansi2.fgHex(c.text) + promptText + ansi2.reset + " ".repeat(Math.max(0, boxWidth - 2 - textPad - promptText.length)) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
    out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(boxWidth - 2) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
    const modelRow = `[model: DS Flash ▾]  [▸]`;
    const modelPad = Math.max(0, Math.floor((boxWidth - 2 - modelRow.length) / 2));
    out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(modelPad) + ansi2.fgHex(c.primary) + modelRow + ansi2.reset + " ".repeat(Math.max(0, boxWidth - 2 - modelPad - modelRow.length)) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
    out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "╰" + "─".repeat(boxWidth - 2) + "╯" + ansi2.reset + `
`);
    out.push(`
`);
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(termWidth));
    out.push(ansi2.reset);
    out.push(`
`);
    const instruction = "Press Enter to begin setup  ·  Ctrl+C to exit";
    const instrPad = Math.max(0, Math.floor((termWidth - instruction.length) / 2));
    out.push(ansi2.fgHex(c.textMuted));
    out.push(" ".repeat(instrPad) + instruction);
    out.push(ansi2.reset);
    process.stdout.write(out.join(""));
  }
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (data === "\r" || data === `
`) {
        cleanup();
        resolve();
        return;
      }
      if (data === "\x03") {
        process.exit(0);
      }
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi2.showCursor);
      process.stdout.write(ansi2.normalScreen);
    }
    process.stdin.on("data", onData);
    render();
  });
}
// ../core/src/providers/definitions.ts
var PROVIDER_DEFS = [
  {
    id: "nous-portal",
    name: "Nous Portal",
    description: "Everything your agent needs, 300+ models with bundled tool use",
    requiresKey: true,
    icon: "◈",
    category: "recommended",
    apiStyle: "openai",
    defaultEndpoint: "https://portal.nousresearch.com/api/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Pay-per-use API aggregator",
    requiresKey: true,
    icon: "◎",
    category: "recommended",
    apiStyle: "openai",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "novita",
    name: "NovitaAI",
    description: "Cloud: Model API, Agent Sandbox, GPU Cloud",
    requiresKey: true,
    icon: "◉",
    apiStyle: "openai",
    defaultEndpoint: "https://api.novita.ai/v3/openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "lm-studio",
    name: "LM Studio",
    description: "Local desktop app with built-in model server",
    requiresKey: false,
    icon: "◐",
    apiStyle: "openai",
    defaultEndpoint: "http://localhost:1234/v1",
    authType: "none",
    directConnect: true
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models via API key or Claude Code",
    requiresKey: true,
    icon: "◑",
    category: "recommended",
    apiStyle: "anthropic",
    defaultEndpoint: "https://api.anthropic.com",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Codex CLI or direct OpenAI API",
    requiresKey: true,
    icon: "◒",
    category: "recommended",
    apiStyle: "openai",
    defaultEndpoint: "https://api.openai.com/v1",
    authType: "api_key",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "qwen",
    name: "Qwen Cloud / DashScope",
    description: "Qwen + multi-provider",
    requiresKey: true,
    icon: "◓",
    apiStyle: "openai",
    defaultEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "xai",
    name: "xAI Grok",
    description: "Direct API or SuperGrok / Premium+ OAuth",
    requiresKey: true,
    icon: "◔",
    apiStyle: "openai",
    defaultEndpoint: "https://api.x.ai/v1",
    authType: "api_key",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "xiaomi",
    name: "Xiaomi MiMo",
    description: "MiMo-V2.5 and V2 models: pro, omni, flash",
    requiresKey: true,
    icon: "◕",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "tencent",
    name: "Tencent TokenHub",
    description: "Hy3 Preview via tokenhub.tencentmaas.com",
    requiresKey: true,
    icon: "◐",
    apiStyle: "openai",
    defaultEndpoint: "https://tokenhub.tencentmaas.com/api/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    description: "Nemotron models via build.nvidia.com or local NIM",
    requiresKey: true,
    icon: "◕",
    category: "recommended",
    apiStyle: "openai",
    defaultEndpoint: "https://integrate.api.nvidia.com/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "GitHub token API or copilot --acp process",
    requiresKey: true,
    icon: "◐",
    apiStyle: "openai",
    authType: "token",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "huggingface",
    name: "Hugging Face Inference Providers",
    description: "HuggingFace Inference API",
    requiresKey: true,
    icon: "◕",
    apiStyle: "openai",
    defaultEndpoint: "https://api-inference.huggingface.co/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "AI Studio API or OAuth + Code Assist",
    requiresKey: true,
    icon: "◑",
    category: "recommended",
    apiStyle: "openai",
    defaultEndpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    authType: "api_key",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "V3, R1, coder, direct API",
    requiresKey: true,
    icon: "◒",
    category: "recommended",
    apiStyle: "openai",
    defaultEndpoint: "https://api.deepseek.com/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "zai",
    name: "Z.AI / GLM",
    description: "Zhipu direct API",
    requiresKey: true,
    icon: "◓",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "kimi",
    name: "Kimi / Moonshot",
    description: "Coding Plan, Moonshot global & China endpoints",
    requiresKey: true,
    icon: "◔",
    apiStyle: "openai",
    defaultEndpoint: "https://api.moonshot.cn/v1",
    authType: "api_key",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "stepfun",
    name: "StepFun Step Plan",
    description: "Agent / coding models via Step Plan API",
    requiresKey: true,
    icon: "◕",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "Global, OAuth Coding Plan & China endpoints",
    requiresKey: true,
    icon: "◐",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "ollama-cloud",
    name: "Ollama Cloud",
    description: "Cloud-hosted open models, ollama.com",
    requiresKey: true,
    icon: "◑",
    apiStyle: "openai",
    defaultEndpoint: "https://api.ollama.com/v1",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "arcee",
    name: "Arcee AI",
    description: "Trinity models, direct API",
    requiresKey: true,
    icon: "◒",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "gmi",
    name: "GMI Cloud",
    description: "Multi-model direct API",
    requiresKey: true,
    icon: "◓",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "kilo",
    name: "Kilo Code",
    description: "Kilo Gateway API",
    requiresKey: true,
    icon: "◔",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Zen pay-as-you-go or Go subscription",
    requiresKey: true,
    icon: "◕",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true,
    hasArrow: true
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    description: "Claude, Nova, Llama, DeepSeek; IAM or API key",
    requiresKey: true,
    icon: "◐",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "azure",
    name: "Azure Foundry",
    description: "OpenAI-style or Anthropic-style endpoint, your Azure AI deployment",
    requiresKey: true,
    icon: "◑",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "qwen-oauth",
    name: "Qwen OAuth",
    description: "Reuses local Qwen CLI login",
    requiresKey: false,
    icon: "◒",
    apiStyle: "openai",
    authType: "oauth",
    directConnect: true
  },
  {
    id: "alibaba",
    name: "Alibaba Cloud Coding Plan",
    description: "Dedicated coding tier",
    requiresKey: true,
    icon: "◓",
    apiStyle: "openai",
    authType: "api_key",
    directConnect: true
  },
  {
    id: "custom",
    name: "custom",
    description: "direct API",
    requiresKey: false,
    icon: "◔",
    apiStyle: "custom",
    authType: "none",
    directConnect: true
  },
  {
    id: "local-ollama",
    name: "Local Ollama",
    description: "openrouter.ai/api/v1 — nvidia/nemotron-3-super-120b-a12b:free",
    requiresKey: false,
    icon: "◕",
    apiStyle: "openai",
    defaultEndpoint: "http://localhost:11434/v1",
    authType: "none",
    directConnect: true
  },
  {
    id: "custom-endpoint",
    name: "Custom endpoint",
    description: "enter URL manually",
    requiresKey: false,
    icon: "◐",
    apiStyle: "custom",
    authType: "none",
    directConnect: true
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    description: "Auto-detected at localhost:11434",
    requiresKey: false,
    icon: "◑",
    apiStyle: "openai",
    defaultEndpoint: "http://localhost:11434/v1",
    authType: "none",
    directConnect: true
  }
];
var META_OPTIONS = [
  {
    id: "__remove_custom",
    name: "Remove a saved custom provider",
    icon: "✕"
  },
  {
    id: "__configure_aux",
    name: "Configure auxiliary models...",
    icon: "⚙"
  },
  {
    id: "__leave_unchanged",
    name: "Leave unchanged",
    icon: "—"
  }
];

// src/components/provider-selector.ts
async function renderProviderSelector(theme = defaultTheme, initialSelected = new Set(["nous-portal", "openrouter", "nvidia"])) {
  const c = theme.colors;
  let cursorIndex = 0;
  const selected = new Set(initialSelected);
  let done = false;
  let result = { selectedProviders: [] };
  const allItems = [
    ...PROVIDER_DEFS.map((p) => ({
      type: "provider",
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      requiresKey: p.requiresKey,
      hasArrow: p.hasArrow
    })),
    ...META_OPTIONS.map((m) => ({
      type: "meta",
      id: m.id,
      name: m.name,
      description: "",
      icon: m.icon
    }))
  ];
  const totalItems = allItems.length;
  const termHeight = process.stdout.rows || 24;
  const termWidth = process.stdout.columns || 80;
  const maxVisible = Math.min(totalItems, termHeight - 6);
  let scrollOffset = 0;
  function render() {
    const out = [];
    out.push(ansi2.altScreen);
    out.push(ansi2.clearScreen);
    out.push(ansi2.moveTo(0, 0));
    out.push(ansi2.hideCursor);
    out.push(ansi2.fgHex(c.primary) + ansi2.bold);
    out.push(`  Select provider:  `);
    out.push(ansi2.reset);
    out.push(ansi2.fgHex(c.textMuted));
    out.push(`↑↓ navigate  ENTER/SPACE select  ESC cancel`);
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi2.reset);
    out.push(`
`);
    for (let i = 0;i < maxVisible && i + scrollOffset < totalItems; i++) {
      const idx = i + scrollOffset;
      const item = allItems[idx];
      const isActive = idx === cursorIndex;
      const isSelectable = item.type === "provider";
      const isChecked = isSelectable && selected.has(item.id);
      if (item.type === "provider") {
        let line = "  ";
        if (isActive) {
          line += ansi2.fgHex(c.primary) + "→ " + ansi2.reset;
        } else {
          line += "  ";
        }
        if (isChecked) {
          line += ansi2.fgHex(c.success) + "(●) " + ansi2.reset;
        } else {
          line += ansi2.fgHex(c.textMuted) + "(○) " + ansi2.reset;
        }
        if (isActive) {
          line += ansi2.fgHex(c.primary) + ansi2.bold + item.name + ansi2.reset;
        } else {
          line += ansi2.fgHex(c.text) + item.name + ansi2.reset;
        }
        if (item.hasArrow) {
          line += ansi2.fgHex(c.textMuted) + " ▸" + ansi2.reset;
        }
        line += ansi2.fgHex(c.textMuted) + ` (${item.description})` + ansi2.reset;
        out.push(line);
        out.push(`
`);
      } else {
        let line = "  ";
        if (isActive) {
          line += ansi2.fgHex(c.primary) + "→ " + ansi2.reset;
        } else {
          line += "  ";
        }
        line += ansi2.fgHex(c.textMuted) + `(○) ` + ansi2.reset;
        line += ansi2.fgHex(c.accent) + item.name + ansi2.reset;
        out.push(line);
        out.push(`
`);
      }
    }
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi2.reset);
    out.push(`
`);
    const selectedCount = selected.size;
    out.push(ansi2.fgHex(c.textMuted));
    out.push(`  ${selectedCount} provider${selectedCount !== 1 ? "s" : ""} selected`);
    out.push(ansi2.reset);
    out.push(`
`);
    process.stdout.write(out.join(""));
  }
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (done)
        return;
      const buf = Buffer.from(data);
      const key = parseKey(buf);
      switch (key.name) {
        case "up":
          cursorIndex = (cursorIndex - 1 + totalItems) % totalItems;
          if (cursorIndex < scrollOffset)
            scrollOffset = cursorIndex;
          if (cursorIndex >= scrollOffset + maxVisible)
            scrollOffset = cursorIndex - maxVisible + 1;
          render();
          break;
        case "down":
          cursorIndex = (cursorIndex + 1) % totalItems;
          if (cursorIndex >= scrollOffset + maxVisible)
            scrollOffset = cursorIndex - maxVisible + 1;
          if (cursorIndex < scrollOffset)
            scrollOffset = cursorIndex;
          render();
          break;
        case "return":
        case "space": {
          const item = allItems[cursorIndex];
          if (item.type === "provider") {
            if (selected.has(item.id)) {
              selected.delete(item.id);
            } else {
              selected.add(item.id);
            }
            if (key.name === "return") {
              if (item.id === "__remove_custom") {
                done = true;
                result = { selectedProviders: [...selected], removeCustom: true };
                cleanup();
                resolve(result);
                return;
              }
              if (item.id === "__configure_aux") {
                done = true;
                result = { selectedProviders: [...selected], configureAux: true };
                cleanup();
                resolve(result);
                return;
              }
              if (item.id === "__leave_unchanged") {
                done = true;
                result = { selectedProviders: [...selected], leaveUnchanged: true };
                cleanup();
                resolve(result);
                return;
              }
            }
            render();
          } else if (key.name === "return") {
            if (item.id === "__remove_custom") {
              done = true;
              result = { selectedProviders: [...selected], removeCustom: true };
              cleanup();
              resolve(result);
              return;
            }
            if (item.id === "__configure_aux") {
              done = true;
              result = { selectedProviders: [...selected], configureAux: true };
              cleanup();
              resolve(result);
              return;
            }
            if (item.id === "__leave_unchanged") {
              done = true;
              result = { selectedProviders: [...selected], leaveUnchanged: true };
              cleanup();
              resolve(result);
              return;
            }
          }
          break;
        }
        case "escape":
        case "c":
          if (key.ctrl || key.name === "escape") {
            done = true;
            result = { selectedProviders: [...selected] };
            cleanup();
            resolve(result);
            return;
          }
          break;
      }
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi2.showCursor);
      process.stdout.write(ansi2.normalScreen);
    }
    process.stdin.on("data", onData);
    render();
  });
}
// src/components/api-key-entry.ts
async function renderApiKeyEntry(providerId, theme = defaultTheme, validate) {
  const c = theme.colors;
  const provider = PROVIDER_DEFS.find((p) => p.id === providerId);
  const providerName = provider?.name || providerId;
  let key = "";
  let cursorPos = 0;
  let done = false;
  let result = { providerId, key: "", skipped: true };
  function render() {
    const out = [];
    out.push(ansi2.altScreen);
    out.push(ansi2.clearScreen);
    out.push(ansi2.moveTo(0, 0));
    out.push(ansi2.hideCursor);
    out.push(ansi2.fgHex(c.primary) + ansi2.bold);
    out.push(`  ${providerName} API Key`);
    out.push(ansi2.reset);
    out.push(`

`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(60));
    out.push(ansi2.reset);
    out.push(`

`);
    out.push(ansi2.fgHex(c.text));
    out.push(`  Paste your key below. It will be stored in
`);
    out.push(`  ~/.nexus/keys.json (chmod 600, never logged).
`);
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.textMuted));
    out.push("  Key:  ");
    out.push(ansi2.reset);
    if (key.length === 0) {
      out.push(ansi2.fgHex(c.textSubtle) + "___" + ansi2.reset);
    } else {
      const masked = "•".repeat(Math.max(0, key.length - 4));
      const visible = key.slice(-4);
      out.push(ansi2.fgHex(c.textMuted) + masked + ansi2.fgHex(c.text) + visible + ansi2.reset);
    }
    out.push(ansi2.fgHex(c.primary) + "█" + ansi2.reset);
    out.push(`

`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(60));
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.textMuted));
    out.push("  Enter to confirm  ·  Ctrl+U to clear  ·  Esc to skip");
    out.push(ansi2.reset);
    process.stdout.write(out.join(""));
  }
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (done)
        return;
      if (data === "\x15") {
        key = "";
        cursorPos = 0;
        render();
        return;
      }
      if (data === "\r" || data === `
`) {
        done = true;
        result = { providerId, key, skipped: false };
        cleanup();
        resolve(result);
        return;
      }
      if (data === "\x1B") {
        done = true;
        result = { providerId, key: "", skipped: true };
        cleanup();
        resolve(result);
        return;
      }
      if (data === "\x03") {
        process.exit(0);
      }
      if (data === "" || data === "\b") {
        key = key.slice(0, -1);
        render();
        return;
      }
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        key += data;
        render();
      }
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi2.showCursor);
      process.stdout.write(ansi2.normalScreen);
    }
    process.stdin.on("data", onData);
    render();
  });
}
// src/components/model-list-input.ts
async function renderModelListInput(providerId, existingModels = [], theme = defaultTheme) {
  const c = theme.colors;
  const provider = PROVIDER_DEFS.find((p) => p.id === providerId);
  const providerName = provider?.name || providerId;
  let models = [...existingModels];
  let currentInput = "";
  let done = false;
  let result = { providerId, models: [], cancelled: true };
  function render() {
    const out = [];
    out.push(ansi2.altScreen);
    out.push(ansi2.clearScreen);
    out.push(ansi2.moveTo(0, 0));
    out.push(ansi2.hideCursor);
    out.push(ansi2.fgHex(c.primary) + ansi2.bold);
    out.push(`  ${providerName} model IDs  (one per line, paste from provider website)`);
    out.push(ansi2.reset);
    out.push(`

`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(60));
    out.push(ansi2.reset);
    out.push(`
`);
    for (const model of models) {
      out.push(ansi2.fgHex(c.text));
      out.push(`  ${model}`);
      out.push(ansi2.reset);
      out.push(`
`);
    }
    out.push(ansi2.fgHex(c.primary));
    out.push(`  ${currentInput}`);
    out.push(ansi2.reset);
    out.push(ansi2.fgHex(c.textSubtle));
    out.push("█");
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(60));
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.textMuted));
    out.push("  Enter blank line to finish  ·  Esc to cancel");
    out.push(ansi2.reset);
    process.stdout.write(out.join(""));
  }
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (done)
        return;
      if (data === "\x03") {
        process.exit(0);
      }
      if (data === "\x1B") {
        done = true;
        result = { providerId, models: [], cancelled: true };
        cleanup();
        resolve(result);
        return;
      }
      if (data === "\r" || data === `
`) {
        if (currentInput.trim() === "") {
          done = true;
          result = { providerId, models, cancelled: false };
          cleanup();
          resolve(result);
          return;
        }
        models.push(currentInput.trim());
        currentInput = "";
        render();
        return;
      }
      if (data === "" || data === "\b") {
        currentInput = currentInput.slice(0, -1);
        render();
        return;
      }
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        currentInput += data;
        render();
      }
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi2.showCursor);
      process.stdout.write(ansi2.normalScreen);
    }
    process.stdin.on("data", onData);
    render();
  });
}
// ../core/src/utils/project-name.ts
import { hostname } from "os";
var ADJECTIVES = [
  "Iron",
  "Cobalt",
  "Titanium",
  "Obsidian",
  "Quantum",
  "Neon",
  "Prism",
  "Helix",
  "Nova",
  "Zenith",
  "Pulse",
  "Crimson",
  "Azure",
  "Onyx",
  "Storm",
  "Blaze",
  "Shadow",
  "Crystal",
  "Flux",
  "Drift",
  "Ember",
  "Frost",
  "Lunar",
  "Solar",
  "Cipher",
  "Vector",
  "Vertex",
  "Nexus",
  "Phantom",
  "Aether",
  "Bolt",
  "Rapid",
  "Swift",
  "Dynamic",
  "Kinetic",
  "Radiant",
  "Vivid",
  "Stark",
  "Steel",
  "Titan",
  "Chrome",
  "Atomic",
  "Binary",
  "Neural",
  "Synth",
  "Echo",
  "Delta",
  "Omega",
  "Alpha",
  "Sigma",
  "Lambda",
  "Theta",
  "Gamma",
  "Epsilon",
  "Zeta",
  "Kappa"
];
var NOUNS = [
  "Falcon",
  "Drift",
  "Forge",
  "Pulse",
  "Spark",
  "Wave",
  "Blade",
  "Storm",
  "Vortex",
  "Cascade",
  "Nebula",
  "Prism",
  "Beacon",
  "Phantom",
  "Sentinel",
  "Warden",
  "Horizon",
  "Meridian",
  "Zenith",
  "Apex",
  "Cipher",
  "Vector",
  "Matrix",
  "Helix",
  "Spiral",
  "Arc",
  "Nexus",
  "Forge",
  "Crucible",
  "Anvil",
  "Spire",
  "Obelisk",
  "Monolith",
  "Striker",
  "Hunter",
  "Ranger",
  "Guardian",
  "Oracle",
  "Sage",
  "Phoenix",
  "Dragon",
  "Serpent",
  "Titan",
  "Golem",
  "Specter",
  "Wraith",
  "Shade",
  "Bolt",
  "Arrow",
  "Lance",
  "Shield"
];
function hashString(str) {
  let hash = 0;
  for (let i = 0;i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
function generateProjectName() {
  const seed = `${hostname()}-${Date.now()}`;
  const hash = hashString(seed);
  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = (hash >> 8) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
}

// src/setup-wizard.ts
var VERSION = "0.1.0";
async function runSetupWizard(theme = defaultTheme) {
  const c = theme.colors;
  const projectName = generateProjectName();
  const result = {
    project_name: projectName,
    providers: {},
    models: {},
    theme: "nexus"
  };
  console.log(`
${c.primary}  Starting Nexus setup wizard...${c.reset}`);
  await renderWelcomeScreen(projectName, VERSION, theme);
  console.log(`
${c.primary}  Step 1/4: Select providers${c.reset}`);
  const providerResult = await renderProviderSelector(theme);
  if (providerResult.leaveUnchanged) {
    console.log(`
${c.success}  Leaving configuration unchanged.${c.reset}`);
    return result;
  }
  for (const providerId of providerResult.selectedProviders) {
    result.providers[providerId] = { enabled: true };
  }
  console.log(`
${c.primary}  Step 2/4: Enter API keys${c.reset}`);
  for (const providerId of providerResult.selectedProviders) {
    const def = PROVIDER_DEFS.find((p) => p.id === providerId);
    if (!def || !def.requiresKey)
      continue;
    const keyResult = await renderApiKeyEntry(providerId, theme);
    if (!keyResult.skipped && keyResult.key) {
      result.providers[providerId].api_key = keyResult.key;
    }
  }
  console.log(`
${c.primary}  Step 3/4: Configure model lists${c.reset}`);
  const configureModels = await promptYesNo("Would you like to configure your model list?", theme);
  if (configureModels) {
    for (const providerId of providerResult.selectedProviders) {
      const def = PROVIDER_DEFS.find((p) => p.id === providerId);
      if (!def)
        continue;
      const modelResult = await renderModelListInput(providerId, [], theme);
      if (!modelResult.cancelled && modelResult.models.length > 0) {
        result.models[providerId] = modelResult.models;
      }
    }
  }
  console.log(`
${c.primary}  Step 4/4: Project name${c.reset}`);
  const customName = await promptTextInput("Your Nexus project name", projectName, theme);
  if (customName.trim()) {
    result.project_name = customName.trim();
  }
  console.log(`
${c.success}  Setup complete ✓${c.reset}`);
  console.log(`
  Providers configured:  ${Object.keys(result.providers).join(", ")}`);
  console.log(`  Models available:      ${Object.values(result.models).flat().length}`);
  console.log(`  Project name:          ${result.project_name}`);
  console.log(`
  Run ${c.primary}nexus${c.reset} in this directory to open the session interface.`);
  console.log(`  Run ${c.primary}nexus --help${c.reset} to see all commands and flags.`);
  return result;
}
async function promptYesNo(question, theme) {
  const c = theme.colors;
  const termWidth = process.stdout.columns || 80;
  const out = [];
  out.push(ansi.altScreen);
  out.push(ansi.clearScreen);
  out.push(ansi.moveTo(0, 0));
  out.push(ansi.hideCursor);
  out.push(`
  ${ansi.fgHex(c.text)}${question}${ansi.reset}

`);
  out.push(ansi.fgHex(c.borderSubtle));
  out.push("─".repeat(60));
  out.push(ansi.reset);
  out.push(`

`);
  out.push(`  ${ansi.fgHex(c.primary)}●${ansi.reset} No  — use the full list from each provider (recommended)
`);
  out.push(`  ${ansi.fgHex(c.textMuted)}○${ansi.reset} Yes — paste exact model IDs for each provider
`);
  out.push(`
`);
  out.push(ansi.fgHex(c.textMuted));
  out.push("  Enter to confirm");
  out.push(ansi.reset);
  process.stdout.write(out.join(""));
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    let selected = false;
    const onData = (data) => {
      if (data === "\x1B[A" || data === "\x1B[B") {
        selected = !selected;
        process.stdout.write(ansi.altScreen + ansi.clearScreen + ansi.moveTo(0, 0));
        const out2 = [];
        out2.push(`
  ${ansi.fgHex(c.text)}${question}${ansi.reset}

`);
        out2.push(ansi.fgHex(c.borderSubtle) + "─".repeat(60) + ansi.reset + `

`);
        out2.push(`  ${ansi.fgHex(selected ? c.textMuted : c.primary)}${selected ? "○" : "●"}${ansi.reset} No  — use the full list from each provider (recommended)
`);
        out2.push(`  ${ansi.fgHex(selected ? c.primary : c.textMuted)}${selected ? "●" : "○"}${ansi.reset} Yes — paste exact model IDs for each provider
`);
        out2.push(`
`);
        out2.push(ansi.fgHex(c.textMuted) + "  Enter to confirm" + ansi.reset);
        process.stdout.write(out2.join(""));
        return;
      }
      if (data === "\r" || data === `
`) {
        cleanup();
        resolve(selected);
        return;
      }
      if (data === "\x03")
        process.exit(0);
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY)
        process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(ansi.showCursor + ansi.normalScreen);
    }
    process.stdin.on("data", onData);
  });
}
async function promptTextInput(label, defaultValue, theme) {
  const c = theme.colors;
  let value = defaultValue;
  const out = [];
  out.push(ansi.altScreen);
  out.push(ansi.clearScreen);
  out.push(ansi.moveTo(0, 0));
  out.push(ansi.hideCursor);
  out.push(`
  ${ansi.fgHex(c.primary)}${ansi.bold}${label}${ansi.reset}

`);
  out.push(ansi.fgHex(c.borderSubtle) + "─".repeat(60) + ansi.reset + `

`);
  out.push(`  Nexus generated a name for this install. You can keep
`);
  out.push(`  it or type your own.

`);
  out.push(`  ${ansi.fgHex(c.textMuted)}Name:  ${ansi.reset}${ansi.fgHex(c.text)}${defaultValue}${ansi.reset}${ansi.fgHex(c.primary)}█${ansi.reset}

`);
  out.push(ansi.fgHex(c.borderSubtle) + "─".repeat(60) + ansi.reset + `

`);
  out.push(ansi.fgHex(c.textMuted) + "  Enter to confirm  ·  Ctrl+U to clear  ·  Esc to keep generated" + ansi.reset);
  process.stdout.write(out.join(""));
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (data === "\x03")
        process.exit(0);
      if (data === "\x1B") {
        cleanup();
        resolve(defaultValue);
        return;
      }
      if (data === "\r" || data === `
`) {
        cleanup();
        resolve(value);
        return;
      }
      if (data === "\x15") {
        value = "";
        render();
        return;
      }
      if (data === "" || data === "\b") {
        value = value.slice(0, -1);
        render();
        return;
      }
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        value += data;
        render();
      }
    };
    function render() {
      process.stdout.write(ansi.altScreen + ansi.clearScreen + ansi.moveTo(0, 0) + ansi.hideCursor);
      const out2 = [];
      out2.push(`
  ${ansi.fgHex(c.primary)}${ansi.bold}${label}${ansi.reset}

`);
      out2.push(ansi.fgHex(c.borderSubtle) + "─".repeat(60) + ansi.reset + `

`);
      out2.push(`  Nexus generated a name for this install. You can keep
`);
      out2.push(`  it or type your own.

`);
      out2.push(`  ${ansi.fgHex(c.textMuted)}Name:  ${ansi.reset}${ansi.fgHex(c.text)}${value}${ansi.reset}${ansi.fgHex(c.primary)}█${ansi.reset}

`);
      out2.push(ansi.fgHex(c.borderSubtle) + "─".repeat(60) + ansi.reset + `

`);
      out2.push(ansi.fgHex(c.textMuted) + "  Enter to confirm  ·  Ctrl+U to clear  ·  Esc to keep generated" + ansi.reset);
      process.stdout.write(out2.join(""));
    }
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY)
        process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(ansi.showCursor + ansi.normalScreen);
    }
    process.stdin.on("data", onData);
  });
}
// src/components/screens/home.ts
function renderHomeScreen(props) {
  const t = props.theme ?? defaultTheme;
  const c = t.colors;
  const out = [];
  const termWidth = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const logoLines = renderSubpixelLogo(c.primary, c.text);
  const logoWidth = logoLines[0]?.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").length || 0;
  const contentHeight = logoLines.length + 3 + 5 + 2;
  const topSpacer = Math.max(1, Math.floor((termHeight - contentHeight) / 2));
  const bottomSpacer = Math.max(1, termHeight - contentHeight - topSpacer);
  for (let i = 0;i < topSpacer; i++)
    out.push(`
`);
  for (const line of logoLines) {
    const visWidth = visibleWidth(line);
    const pad = Math.max(0, Math.floor((termWidth - visWidth) / 2));
    out.push(" ".repeat(pad) + line + `
`);
  }
  const subtitle = `${props.projectName} · v${props.version}`;
  const subPad = Math.max(0, Math.floor((termWidth - subtitle.length) / 2));
  out.push(" ".repeat(subPad) + ansi2.fgHex(c.textMuted) + subtitle + ansi2.reset + `
`);
  out.push(`
`);
  const boxWidth = Math.max(75, Math.floor(termWidth * 0.7));
  const boxPad = Math.max(0, Math.floor((termWidth - boxWidth) / 2));
  out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "╭" + "─".repeat(boxWidth - 2) + "╮" + ansi2.reset + `
`);
  const promptText = "What would you like to do?";
  const textPad = Math.max(0, Math.floor((boxWidth - 2 - promptText.length) / 2));
  out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(textPad) + ansi2.fgHex(c.text) + promptText + ansi2.reset + " ".repeat(Math.max(0, boxWidth - 2 - textPad - promptText.length)) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
  out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(boxWidth - 2) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
  const modelLabel = `[model: ${props.currentModel} ▾]  [▸]`;
  const modelPad = Math.max(0, Math.floor((boxWidth - 2 - modelLabel.length) / 2));
  out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(modelPad) + ansi2.fgHex(c.primary) + modelLabel + ansi2.reset + " ".repeat(Math.max(0, boxWidth - 2 - modelPad - modelLabel.length)) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
  out.push(" ".repeat(boxPad) + ansi2.fgHex(c.borderActive) + "╰" + "─".repeat(boxWidth - 2) + "╯" + ansi2.reset + `
`);
  for (let i = 0;i < bottomSpacer; i++)
    out.push(`
`);
  out.push(ansi2.fgHex(c.borderSubtle) + "─".repeat(termWidth) + ansi2.reset + `
`);
  const footerLeft = props.cwd;
  const footerRight = `[${props.mode}] · ${props.providerCount} provider${props.providerCount !== 1 ? "s" : ""} · ${props.modelCount} model${props.modelCount !== 1 ? "s" : ""}`;
  const footerGap = termWidth - footerLeft.length - footerRight.length;
  out.push(ansi2.fgHex(c.text) + footerLeft + ansi2.reset + " ".repeat(Math.max(1, footerGap)) + ansi2.fgHex(c.textMuted) + footerRight + ansi2.reset);
  return out.join("");
}
function renderSubpixelLogo(primaryHex, textHex) {
  const p = ansi2.fgHex(primaryHex);
  const t = ansi2.fgHex(textHex);
  const r = ansi2.reset;
  return [
    `${p}███╗  ██╗${t}███████╗${p}██╗  ██╗${t}██╗   ██╗${p}███████╗${r}`,
    `${p}████╗ ██║${t}██╔════╝${p}╚██╗██╔╝${t}██║   ██║${p}██╔════╝${r}`,
    `${p}██╔██╗██║${t}█████╗${p}   ╚███╔╝ ${t}██║   ██║${p}███████╗${r}`,
    `${p}██║╚████║${t}██╔══╝${p}   ██╔██╗ ${t}██║   ██║${p}╚════██║${r}`,
    `${p}██║ ╚███║${t}███████╗${p}██╔╝ ██╗${t}╚██████╔╝${p}███████║${r}`,
    `${p}╚═╝  ╚══╝${t}╚══════╝${p}╚═╝  ╚═╝ ${t} ╚═════╝ ${p}╚══════╝${r}`
  ];
}
// src/components/screens/session.ts
function renderSessionScreen(props) {
  const t = props.theme ?? defaultTheme;
  const c = t.colors;
  const out = [];
  const termWidth = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const sidebarWidth = 42;
  const showSidebar = termWidth > 120;
  const mainWidth = showSidebar ? termWidth - sidebarWidth - 1 : termWidth;
  const footerHeight = 3;
  const sidebarLines = showSidebar ? renderSidebar(props.sidebar, sidebarWidth, t) : [];
  const mainLines = [];
  for (const msg of props.messages) {
    mainLines.push(...renderMessage(msg, mainWidth, t));
    mainLines.push("");
  }
  const maxLines = termHeight - footerHeight;
  for (let i = 0;i < maxLines; i++) {
    const mainLine = mainLines[i] || "";
    const sideLine = sidebarLines[i] || "";
    const mainVis = visibleWidth(mainLine);
    const mainMax = showSidebar ? mainWidth - 2 : mainWidth;
    const truncatedMain = mainVis > mainMax ? truncate(mainLine, mainMax) : mainLine;
    const mainPad = Math.max(0, mainMax - visibleWidth(truncatedMain));
    if (showSidebar) {
      out.push(truncatedMain + " ".repeat(mainPad) + ansi2.fgHex(c.borderSubtle) + "│" + ansi2.reset + sideLine + `
`);
    } else {
      out.push(truncatedMain + `
`);
    }
  }
  out.push(ansi2.fgHex(c.borderSubtle) + "─".repeat(termWidth) + ansi2.reset + `
`);
  const promptBarWidth = Math.max(75, Math.floor(termWidth * 0.7));
  const promptPad = Math.max(0, Math.floor((termWidth - promptBarWidth) / 2));
  const modeLabel = props.modeLabel || "single";
  const promptText = `[${modeLabel} ▾]  Ask anything...    [ctrl+p]`;
  const promptTextPad = Math.max(0, Math.floor((promptBarWidth - 2 - promptText.length) / 2));
  out.push(" ".repeat(promptPad) + ansi2.fgHex(c.borderActive) + "╭" + "─".repeat(promptBarWidth - 2) + "╮" + ansi2.reset + `
`);
  out.push(" ".repeat(promptPad) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + " ".repeat(promptTextPad) + ansi2.fgHex(c.textMuted) + promptText + ansi2.reset + " ".repeat(Math.max(0, promptBarWidth - 2 - promptTextPad - promptText.length)) + ansi2.fgHex(c.borderActive) + "│" + ansi2.reset + `
`);
  out.push(" ".repeat(promptPad) + ansi2.fgHex(c.borderActive) + "╰" + "─".repeat(promptBarWidth - 2) + "╯" + ansi2.reset + `
`);
  out.push(ansi2.fgHex(c.borderSubtle) + "─".repeat(termWidth) + ansi2.reset + `
`);
  const footerLeft = props.cwd;
  const footerRight = `[${modeLabel}] · ${props.model} · ${props.modelCount} model${props.modelCount !== 1 ? "s" : ""}`;
  const footerGap = termWidth - footerLeft.length - footerRight.length;
  out.push(ansi2.fgHex(c.text) + footerLeft + ansi2.reset + " ".repeat(Math.max(1, footerGap)) + ansi2.fgHex(c.textMuted) + footerRight + ansi2.reset);
  return out.join("");
}
function renderMessage(msg, maxWidth, theme) {
  const c = theme.colors;
  const lines = [];
  if (msg.role === "user") {
    const border = ansi2.fgHex(c.primary) + "│" + ansi2.reset;
    const content = msg.content;
    const wrapped = wordWrap(content, maxWidth - 4);
    for (const line of wrapped) {
      lines.push(border + " " + ansi2.fgHex(c.text) + line + ansi2.reset);
    }
  } else if (msg.role === "assistant") {
    const wrapped = wordWrap(msg.content, maxWidth - 3);
    for (const line of wrapped) {
      lines.push("   " + ansi2.fgHex(c.text) + line + ansi2.reset);
    }
    if (msg.toolCalls) {
      for (const tool of msg.toolCalls) {
        if (tool.type === "inline") {
          lines.push("   " + ansi2.fgHex(c.info) + tool.icon + " " + ansi2.fgHex(c.textMuted) + tool.name + ansi2.reset);
        } else {
          lines.push(ansi2.fgHex(c.border) + "│" + ansi2.reset + ansi2.fgHex(c.backgroundPanel) + ` # ${tool.name}` + ansi2.reset);
          if (tool.output) {
            const outputLines = tool.output.split(`
`).slice(0, 5);
            for (const ol of outputLines) {
              lines.push(ansi2.fgHex(c.border) + "│" + ansi2.reset + " " + ansi2.fgHex(c.textMuted) + ol + ansi2.reset);
            }
          }
        }
      }
    }
    if (msg.model) {
      const footerText = `▣ ${msg.model}${msg.durationMs ? ` · ${(msg.durationMs / 1000).toFixed(1)}s` : ""}`;
      lines.push("   " + ansi2.fgHex(c.primary) + footerText + ansi2.reset);
    }
  }
  return lines;
}
function renderSidebar(sidebar, width, theme) {
  const c = theme.colors;
  const lines = [];
  const innerWidth = width - 4;
  lines.push("  " + ansi2.fgHex(c.text) + sidebar.title + ansi2.reset);
  lines.push("  " + ansi2.fgHex(c.borderSubtle) + "─".repeat(innerWidth) + ansi2.reset);
  lines.push("");
  lines.push("  " + ansi2.fgHex(c.textMuted) + "Mode: " + ansi2.fgHex(c.text) + sidebar.mode + ansi2.reset);
  const modelDisplay = sidebar.modelAlias || truncate(sidebar.model, innerWidth - 8);
  lines.push("  " + ansi2.fgHex(c.textMuted) + "Model: " + ansi2.fgHex(c.text) + modelDisplay + ansi2.reset);
  lines.push("");
  lines.push("  " + ansi2.fgHex(c.borderSubtle) + "─".repeat(innerWidth) + ansi2.reset);
  lines.push("");
  lines.push("  " + ansi2.fgHex(c.textMuted) + "Files" + ansi2.reset);
  if (sidebar.files) {
    for (const file of sidebar.files.slice(0, 5)) {
      const display = truncate(file, innerWidth - 4);
      lines.push("  " + ansi2.fgHex(c.text) + "• " + display + ansi2.reset);
    }
  }
  lines.push("");
  lines.push("  " + ansi2.fgHex(c.borderSubtle) + "─".repeat(innerWidth) + ansi2.reset);
  lines.push("");
  if (sidebar.mcpCount !== undefined) {
    lines.push("  " + ansi2.fgHex(c.textMuted) + "MCP  " + ansi2.fgHex(c.info) + "⊙ " + sidebar.mcpCount + ansi2.reset);
  }
  if (sidebar.lspLanguages && sidebar.lspLanguages.length > 0) {
    lines.push("  " + ansi2.fgHex(c.textMuted) + "LSP  • " + ansi2.fgHex(c.text) + sidebar.lspLanguages.join(", ") + ansi2.reset);
  }
  lines.push("");
  lines.push("  " + ansi2.fgHex(c.borderSubtle) + "─".repeat(innerWidth) + ansi2.reset);
  lines.push("");
  if (sidebar.version) {
    lines.push("  " + ansi2.fgHex(c.textMuted) + "• Nexus" + ansi2.reset);
    lines.push("  " + ansi2.fgHex(c.textMuted) + "  v" + sidebar.version + ansi2.reset);
  }
  return lines;
}
function wordWrap(text, maxWidth) {
  const lines = [];
  const paragraphs = text.split(`
`);
  for (const para of paragraphs) {
    if (para.length <= maxWidth) {
      lines.push(para);
      continue;
    }
    const words = para.split(" ");
    let currentLine = "";
    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxWidth) {
        if (currentLine)
          lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    }
    if (currentLine)
      lines.push(currentLine);
  }
  return lines;
}
// src/components/command-palette.ts
var DEFAULT_COMMANDS = [
  { name: "New Session", keybind: "Ctrl+X n", category: "Session" },
  { name: "Session List", keybind: "Ctrl+X l", category: "Session" },
  { name: "Rename Session", keybind: "Ctrl+R", category: "Session" },
  { name: "Fork Session", category: "Session" },
  { name: "Compact Session", keybind: "Ctrl+X c", category: "Session" },
  { name: "Export Session", category: "Session" },
  { name: "Share Session", category: "Session" },
  { name: "Timeline", category: "Session" },
  { name: "Cycle Model", keybind: "Ctrl+M", category: "Model" },
  { name: "Configure Models", category: "Model" },
  { name: "Single Model", category: "Mode" },
  { name: "Multi-Model", category: "Mode" },
  { name: "Full Conversational", category: "Mode" },
  { name: "Toggle Sidebar", keybind: "Ctrl+X b", category: "Navigation" },
  { name: "Theme Picker", keybind: "Ctrl+X t", category: "Navigation" },
  { name: "Status", keybind: "Ctrl+X s", category: "Navigation" },
  { name: "Jump to Message", keybind: "Ctrl+X g", category: "Navigation" },
  { name: "Help", keybind: "?", category: "System" },
  { name: "Setup", category: "System" },
  { name: "Quit", keybind: "Ctrl+C", category: "System" }
];
async function renderCommandPalette(theme = defaultTheme) {
  const c = theme.colors;
  const termWidth = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  let query = "";
  let cursorIndex = 0;
  let done = false;
  let result = null;
  function getFilteredCommands() {
    if (!query)
      return DEFAULT_COMMANDS;
    const lowerQuery = query.toLowerCase();
    return DEFAULT_COMMANDS.filter((cmd) => cmd.name.toLowerCase().includes(lowerQuery) || cmd.category.toLowerCase().includes(lowerQuery));
  }
  function render() {
    const filtered = getFilteredCommands();
    const maxVisible = Math.min(filtered.length, termHeight - 6);
    const out = [];
    out.push(ansi2.altScreen);
    out.push(ansi2.clearScreen);
    out.push(ansi2.moveTo(0, 0));
    out.push(ansi2.hideCursor);
    out.push(ansi2.fgHex(c.primary));
    out.push(`  \uD83D\uDD0D ${query}`);
    out.push(ansi2.fgHex(c.textSubtle) + "█" + ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi2.reset);
    out.push(`
`);
    let currentCategory = "";
    let itemIndex = 0;
    for (const cmd of filtered.slice(0, maxVisible)) {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        out.push(ansi2.fgHex(c.textMuted) + ansi2.bold + `  ${currentCategory}` + ansi2.reset + `
`);
      }
      const isActive = itemIndex === cursorIndex;
      if (isActive) {
        out.push(ansi2.fgHex(c.primary) + "  → " + ansi2.reset);
      } else {
        out.push("    ");
      }
      out.push(ansi2.fgHex(isActive ? c.primary : c.text) + cmd.name + ansi2.reset);
      if (cmd.keybind) {
        const nameWidth = visibleWidth(cmd.name);
        const keybindPad = Math.max(0, 40 - nameWidth);
        out.push(" ".repeat(keybindPad) + ansi2.fgHex(c.textMuted) + cmd.keybind + ansi2.reset);
      }
      out.push(`
`);
      itemIndex++;
    }
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(Math.min(termWidth - 2, 80)));
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.textMuted));
    out.push("  ↑↓ navigate  ·  enter select  ·  esc cancel");
    out.push(ansi2.reset);
    process.stdout.write(out.join(""));
  }
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (done)
        return;
      const filtered = getFilteredCommands();
      switch (data) {
        case "\x1B[A":
          cursorIndex = (cursorIndex - 1 + filtered.length) % filtered.length;
          render();
          break;
        case "\x1B[B":
          cursorIndex = (cursorIndex + 1) % filtered.length;
          render();
          break;
        case "\r":
          if (filtered[cursorIndex]) {
            done = true;
            result = filtered[cursorIndex];
            cleanup();
            resolve(result);
          }
          break;
        case "\x1B":
        case "\x03":
          done = true;
          result = null;
          cleanup();
          resolve(null);
          break;
        case "":
          query = query.slice(0, -1);
          cursorIndex = 0;
          render();
          break;
        default:
          if (data.length === 1 && data.charCodeAt(0) >= 32) {
            query += data;
            cursorIndex = 0;
            render();
          }
          break;
      }
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi2.showCursor);
      process.stdout.write(ansi2.normalScreen);
    }
    process.stdin.on("data", onData);
    render();
  });
}
// src/components/mode-switcher.ts
var MODE_OPTIONS = [
  { id: "single", name: "Single Model", description: "Standard coding with one model" },
  { id: "multi", name: "Multi-Model", description: "Orchestrator + specialist agents" },
  { id: "conversational", name: "Full Conversational", description: "Panel of models that discuss together" }
];
async function renderModeSwitcher(currentMode = "single", theme = defaultTheme) {
  const c = theme.colors;
  let cursorIndex = MODE_OPTIONS.findIndex((m) => m.id === currentMode);
  if (cursorIndex < 0)
    cursorIndex = 0;
  let done = false;
  let result = null;
  function render() {
    const out = [];
    out.push(ansi2.altScreen);
    out.push(ansi2.clearScreen);
    out.push(ansi2.moveTo(0, 0));
    out.push(ansi2.hideCursor);
    out.push(ansi2.fgHex(c.primary) + ansi2.bold);
    out.push("  Operating mode");
    out.push(ansi2.reset);
    out.push(`

`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(60));
    out.push(ansi2.reset);
    out.push(`

`);
    for (let i = 0;i < MODE_OPTIONS.length; i++) {
      const opt = MODE_OPTIONS[i];
      const isActive = i === cursorIndex;
      const isCurrent = opt.id === currentMode;
      if (isActive) {
        out.push(ansi2.fgHex(c.primary) + "  → " + ansi2.reset);
      } else {
        out.push("    ");
      }
      if (isCurrent) {
        out.push(ansi2.fgHex(c.primary) + "(●) " + ansi2.reset);
      } else {
        out.push(ansi2.fgHex(c.textMuted) + "(○) " + ansi2.reset);
      }
      out.push(ansi2.fgHex(isActive ? c.primary : c.text) + opt.name + ansi2.reset);
      const descPad = Math.max(0, 25 - opt.name.length);
      out.push(" ".repeat(descPad) + ansi2.fgHex(c.textMuted) + opt.description + ansi2.reset);
      out.push(`
`);
    }
    out.push(`
`);
    out.push(ansi2.fgHex(c.borderSubtle));
    out.push("─".repeat(60));
    out.push(ansi2.reset);
    out.push(`
`);
    out.push(ansi2.fgHex(c.textMuted));
    out.push("  ↑↓ move  ·  enter select  ·  esc cancel");
    out.push(ansi2.reset);
    process.stdout.write(out.join(""));
  }
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    const onData = (data) => {
      if (done)
        return;
      switch (data) {
        case "\x1B[A":
          cursorIndex = (cursorIndex - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length;
          render();
          break;
        case "\x1B[B":
          cursorIndex = (cursorIndex + 1) % MODE_OPTIONS.length;
          render();
          break;
        case "\r":
          done = true;
          result = MODE_OPTIONS[cursorIndex].id;
          cleanup();
          resolve(result);
          break;
        case "\x1B":
        case "\x03":
          done = true;
          result = null;
          cleanup();
          resolve(null);
          break;
      }
    };
    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(ansi2.showCursor);
      process.stdout.write(ansi2.normalScreen);
    }
    process.stdin.on("data", onData);
    render();
  });
}
export {
  wrapText,
  visibleWidth,
  truncate,
  stripAnsi,
  runSetupWizard,
  resolveSemanticColors,
  renderWelcomeScreen,
  renderSessionScreen,
  renderProviderSelector,
  renderModelListInput,
  renderModeSwitcher,
  renderHomeScreen,
  renderCommandPalette,
  renderApiKeyEntry,
  parseKey,
  padOrTruncate,
  loadThemeFile,
  loadTheme,
  formatTokens,
  formatDuration,
  defaultTheme,
  ansi2 as ansi
};
