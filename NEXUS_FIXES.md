# Nexus — Fix Log (for Hermes Agent)

These changes were made by Claude (Opus) on a macOS machine to take Nexus from a
**non-functional scaffold** to a **working tool** that actually calls AI providers,
launches a TUI, serves MCP, and compiles to a standalone macOS binary.

**Hermes: please do NOT revert the items below.** Each entry says *what* changed and
*why*. The "Contracts to preserve" section at the end lists the load-bearing
interfaces — keep those stable if you regenerate code.

Status after fixes: `bun run build` ✅ · `tsc --noEmit` → **0 errors** ✅ ·
`bun run compile:darwin-arm64` → 60 MB Mach-O arm64 binary ✅ · real provider HTTP
call verified (reaches OpenRouter and authenticates).

---

## 1. The core problem (was): nothing was wired together

The provider classes, agent runners, and event schema existed but the CLI never
called them — headless mode emitted a hardcoded *"This is a placeholder response"*,
TUI crashed on launch, and `setup`/`serve` were never dispatched. The fixes below
connect **CLI → config/keys → provider engine → real `.complete()` calls**.

---

## 2. Build / workspace / packaging

| File | Change | Why |
|------|--------|-----|
| `package.json` (root) | Added `"workspaces": ["packages/*"]` | Without it, `workspace:*` deps and `bun --filter` never resolved — packages weren't linked. |
| `package.json` (root) | `zod ^4.4.3` → `^3.23.8`; removed `better-sqlite3` | All sub-packages use zod v3 APIs (v4 is breaking). better-sqlite3 is a native addon that can't embed in a compiled binary. |
| `package.json` (root) | Added `compile`, `compile:darwin-arm64`, `compile:darwin-x64`, `compile:linux-x64` scripts | `bun build --compile` standalone binaries. |
| `tsconfig.json` (root) | Replaced misconfigured composite config (`rootDir: ./src` didn't exist) with a flat monorepo typecheck config | Old config produced 45 phantom TS6059/TS6305 errors. |
| `packages/*/package.json` | `main`/`module`/`types`/`exports` now point at `./src/index.ts` (was `dist/index.mjs`, which the build never produced) | Bun runs/compiles TS from source; the old `.mjs` entries didn't exist, so `import '@nexus-ai/core'` would have failed once actually used. |
| `packages/tui/package.json` | Removed phantom deps: `solid-js`, `@opentui/core`, `@opentui/solid`, `chalk`, `zod`, `@nexus-ai/models`, `@nexus-ai/session` | None were imported. `@opentui/*@^0.1.0` doesn't even exist on npm (only 0.4.x). The TUI uses the hand-rolled ANSI renderer in `src/utils/ansi.ts`. |
| `packages/models/package.json`, `packages/session/package.json` | **Created** (were missing) | `packages/*` workspace members must have a manifest. |
| `packages/cli/package.json` | Added `@nexus-ai/session` dependency | CLI imports it for persistence; bun only resolves declared workspace deps. |

> **TUI note:** the spec called for SolidJS + OpenTUI. That was never implemented —
> the real renderer is plain ANSI strings. I kept and wired the ANSI renderer rather
> than pulling in OpenTUI 0.4.x (heavy, native bindings, won't embed in a compiled
> binary). A future OpenTUI migration is possible but is its own project.

---

## 3. Provider layer (`packages/core/src/providers/`)

| File | Change | Why |
|------|--------|-----|
| `base.ts` | Added `apiKey` field + `setApiKey()`; added overridable `authHeaders(key)` | Providers had no way to receive the real key; the engine now sets it. |
| `base.ts` | `makeRequest`/`makeStreamRequest`: key param optional → defaults to `this.apiKey`; URL falls back `baseUrl || default_base_url` | **Two real bugs:** (1) every provider passed the *model name* as the API key argument; (2) `baseUrl` was `''` because the base constructor reads `default_base_url` before the subclass field initializer runs (TS field-init order) → "fetch URL invalid". |
| `anthropic.ts` | Removed model-as-key; added `authHeaders` returning `x-api-key` + `anthropic-version` | Anthropic doesn't use Bearer auth. |
| `openrouter.ts` | Removed model-as-key; send **full** `vendor/model` id (strip only a leading `openrouter/`); typed `makeRequest<any>` | OpenRouter requires the full id (`deepseek/deepseek-v4-flash`); stripping the prefix broke it. |
| `nvidia/google/openai/groq/mistral/cohere/custom.ts` | Removed model-as-key (the bogus 3rd arg to `makeRequest`) | Same auth bug across all providers. |
| `google.ts` | Fixed `options` referenced out of scope in `fromGoogleFormat` | Real `ReferenceError`/compile error. |
| `types.ts` | Added `setBaseUrl`/`setApiKey` to the `Provider` interface | So the engine can configure providers in a typed way. |

---

## 4. New shared engine (`packages/agent/src/engine.ts` — NEW FILE)

The single place that turns a request into a real model call. **This is the most
important new contract — keep it.**

- `resolveTarget(config, req)` → picks `{providerId, model}` from `--provider`/`--model`,
  else infers from model id, else config defaults / first enabled provider.
- `prepareProvider(config, keys, id)` → gets the registry provider, sets base URL + API key,
  throws `NexusError(code 2)` if a required key is missing.
- `streamText(...)` → async generator of text deltas (used by headless `--json`/`--print` and TUI).
- `runText(...)` → non-streaming `{text, model, usage}`.
- `makeCompleteFn(config, keys)` → a `(req) => Promise<string>` closure for the agent runners.
- `NexusError(message, code)` → carries the spec's exit codes (2 config, 3 provider, 4 timeout).

`runner.ts` and `conversational.ts` were changed to take a `CompleteFn` instead of the
old broken `Map<string, {complete:(prompt,opts)=>Promise<string>}>` — the old type didn't
match the real provider interface (`complete(CompletionOptions): Promise<CompletionResponse>`),
so multi/conversational modes could never have worked.

---

## 5. CLI (`packages/cli/src/index.ts` — REWRITTEN)

- **Headless now calls real providers** (was a hardcoded placeholder). Single mode
  streams via `streamText`; `--json` emits `session.start`/`content.delta`/`content.done`/
  `session.end` NDJSON; `--print`/text writes plain text. Multi & conversational modes wired
  to the agent runners.
- **Exit codes** per spec: 0 ok, 2 config, 3 provider, 4 timeout, 5 SIGINT. `--timeout` enforced.
- **`setup` and `serve` are now dispatched** (positional commands were previously ignored).
- **TUI is now an interactive REPL** that calls the engine, keeps multi-turn context, supports
  `/model`, `/help`, `/exit`. Fixed the missing `renderHomeScreen` import and a bad relative
  import that crashed on launch.
- **`setup`** is a new readline-based flow (providers → keys → models → project name) that
  writes `config.json` + `keys.json` (chmod 600). It bypasses the fancy `tui/setup-wizard.ts`
  (which had ANSI/color bugs); the wizard is left in the tree but is not on the critical path.

## 6. MCP server (`packages/cli/src/mcp-server.ts`)

- Handlers (`nexus_complete`, `nexus_models`, `nexus_conversational`) now call the engine
  (were placeholders returning fake text).
- Transport switched from HTTP-on-:3000 to **stdio newline-delimited JSON-RPC** — the transport
  MCP clients (Claude Code, OpenCode) use by default. Notifications (no `id`) get no response.

## 7. Session store (`packages/session/src/store.ts` — REWRITTEN)

- **Was syntactically broken** (an unterminated SQL template literal — missing backtick — made
  the file fail to parse).
- Migrated from `better-sqlite3` (native addon, wrong `import { Database }`) to **`bun:sqlite`**
  (built into Bun, embeds in the compiled binary). Switched named params to positional `?`.
- Removed the eager module-level `new SessionStore()` singleton (opened a DB file on import).
- Added `src/index.ts` barrel. CLI persists single-mode sessions (best-effort; skipped for `--oneshot`).

## 8. Smaller fixes

| File | Change |
|------|--------|
| `core/src/config/manager.ts` | Import `NexusConfig` from `./types` (it was wrongly imported from `./schema`, which doesn't export it). |
| `core/src/config/schema.ts` | Removed explicit `z.ZodType<…>` annotations (zod v3 variance errors). |
| `core/src/config/types.ts` | `agents`/`conversational` made optional (match schema + `DEFAULT_CONFIG`). |
| `core/src/index.ts` | Re-export `config/types` explicitly minus `ProviderConfig` (duplicate-export ambiguity). |
| `models/src/index.ts` | Cross-package deep import `../core/src/...` → `@nexus-ai/core`. |
| `tui/src/setup-wizard.ts` | Added missing `ansi` import; deep imports → `@nexus-ai/core`; `c.reset` → `ansi.reset`. |
| `tui/src/utils/ansi.ts` | `parseKey`: `str === '\x1b'` → `str[0] === '\x1b'` (the old form made all arrow-key branches dead code). |
| `tui/src/components/screens/session.ts` | Added `model` to `SessionScreenProps`. |
| `tools/src/types.ts` | `ToolParameter.required` now `boolean \| string[]`. |
| `scripts/install.sh` | Repo URL overridable via `NEXUS_REPO_URL`. |

---

## Contracts to preserve (don't regenerate these away)

1. **`Provider`** (`core/src/providers/types.ts`): `complete(CompletionOptions): Promise<CompletionResponse>`,
   `completeStream(...): AsyncIterable<StreamChunk>`, plus `setBaseUrl`/`setApiKey`. Providers must
   **not** pass the model id as the key arg, and must use `this.apiKey`.
2. **Engine API** (`agent/src/engine.ts`): `streamText`, `runText`, `makeCompleteFn`, `resolveTarget`,
   `prepareProvider`, `NexusError`. The CLI and MCP server depend on these.
3. **`CompleteFn`** = `(req: EngineRequest) => Promise<string>` — what the runners consume.
4. **Package entries point at `src`** and the root has a `workspaces` field. Don't restore the
   `dist/index.mjs` entry points (the build doesn't emit `.mjs`).
5. **`bun:sqlite`**, not better-sqlite3 (binary compatibility).
6. **Exit codes**: 0/1/2/3/4/5 as in `NexusError`.

## Not verified
A **successful 200** response needs a real API key. The full request path is proven
(the binary reaches OpenRouter and authenticates — a bogus key returns "invalid key").
Provide a real key in `~/.nexus/keys.json` to confirm an end-to-end completion. Gemini's
non-OpenAI request shape and the fancy `tui/setup-wizard.ts` screens are the least-exercised
paths.
