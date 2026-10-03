# LINEDOWN — sponsor integration notes

**M2 deliverable (RECON track).** Written 14:00–14:25, 3 Oct 2026.

Every fact below is labelled:

- **VERIFIED** — read in real docs or real SDK source. Source path/URL given.
- **UNVERIFIED** — inferred. Do not build a demo beat on these without testing first.

ZooWork / BAND facts are **source-reviewed from cloned repos**, not recalled. Tavily / Entire are
from live official docs.

| Sponsor | Confidence | One-line verdict |
|---|---|---|
| ZooWork | **VERIFIED** (full source) | Use it. Agent→Session→Events is solid. `custom_tools` is our block gate. |
| Tavily | **VERIFIED** (official docs) | Trivial. `@tavily/core`, 1 credit/search. |
| Entire | **VERIFIED CLI** / **UNVERIFIED web URL** | CLI path is safe. Do NOT promise a hosted blame URL on stage. |
| BAND | **VERIFIED** (full source) | Rooms are real; **no native veto**. Use as narration only. |
| Moss | n/a | Owned by MOSS track. Not in scope here. |

---

## 1. ZooWork — THE priority ("Best Use of ZooWork" prize)

Source: `github.com/SerendipityOneInc/zoowork-sdk-skills` (skill + references),
`zoowork-sdk-typescript`, `zoowork-agents-docs`. All three cloned and read.
Public docs: <https://zoowork.ai/docs/>. Machine-readable: `https://zoowork.ai/docs/llms-full.txt`.

### 1.1 Install — VERIFIED

```bash
# the coding-agent skill (teaches Claude Code how to call ZooWork) — needs Node 22.20+
npx skills add SerendipityOneInc/zoowork-sdk-skills

# the actual runtime SDK — this is what the app imports
npm install @zoowork-ai/sdk          # TypeScript, needs Node 20+
python -m pip install zoowork        # Python, needs Python 3.10+
```

Docs assume `@zoowork-ai/sdk` **0.10.0+** / `zoowork` **0.5.0+**. AGENTS reports 0.10.2 installed.

> The two installs are different things. The `npx skills add` one is a *coding* skill. A ZooWork
> **platform Skill** is a ZIP attached to a running Agent. Don't confuse them.

### 1.2 Auth / env — VERIFIED

| Var | Required | Note |
|---|---|---|
| `ZOOWORK_API_KEY` | **yes** | Project API key (`zwp_live_…`) from <https://platform.zoowork.ai>. Shown once. |
| `ZOOWORK_BASE_URL` | no | Defaults to production. **Leave unset.** |
| `ZOOWORK_WEBHOOK_SECRET` | only for webhooks | Read by the webhook verifier. |

```ts
export const DEFAULT_BASE_URL = 'https://clawapi.ecap.gsmo.ai/service/v1'
```

**There is no `ZOOWORK_ORG_ID`.** The gateway derives the tenant from the key. An org id in your
env is dead config.

**20-minute traps, both real:**
- `DEFAULT_BASE_URL` **already contains `/service/v1`**. Appending another `/v1` 404s every call.
- `createZooworkClient()` throws a **plain `Error`, not a `ZooworkError`**, when no key resolves —
  so `catch (e) { if (e instanceof ZooworkError) }` will not match it.
- The guard tests `cfg.apiKey !== undefined`, not truthiness. So
  `createZooworkClient({ apiKey: process.env.ZOOWORK_API_KEY ?? '' })` **slips past the guard**,
  builds a client that sends an empty bearer, and 401s on the first call. Only the env-var path
  maps `''` to unset. **Just call `createZooworkClient()` with no args.**

### 1.3 The 5 calls we actually need — VERIFIED signatures

```ts
listModels(): Promise<ModelInfo[]>                                  // no args, no paging
createAgent(input: { resource: AgentResource; ownership?: Ownership },
            idempotencyKey?: string): Promise<AgentRecord>
startAgent(agentId: string): Promise<{ warnings: string[] }>
waitUntilRunning(agentId: string,
                 opts?: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal }
                ): Promise<AgentRecord>                             // default timeoutMs 30_000
createSession(agentId: string,
              input: { initial_events?: OutboundEvent[]; metadata?: Record<string, unknown>;
                       runtime_mode?: 'active'; idle_compaction?: boolean | null },
              idempotencyKey?: string): Promise<SessionRecord>      // 409 agent_not_running if not running
streamEvents(agentId: string, sessionId: string,
             opts?: { after?: number; cursor?: string; signal?: AbortSignal }
            ): AsyncGenerator<SessionEvent>                         // a GENERATOR, not a promise
postEvents(agentId: string, sessionId: string,
           events: OutboundEvent[]): Promise<{ events: PostEventReceipt[] }>   // later turns
```

Plus the two that make our **block** beat real (§1.6):

```ts
listCustomToolCalls(agentId: string, opts?: { status?: 'pending' }): Promise<CustomToolCallRecord[]>
resolveCustomToolCall(agentId: string, callId: string,
  input: { content: CustomToolResultContent[]; isError?: boolean; resolvedBy?: string }
): Promise<CustomToolCallRecord>
```

**Four invariants** (the documented top reasons code compiles then fails at runtime):

1. `createAgent` creates a **stopped** Agent → `startAgent(id)` → `waitUntilRunning(id)` before any Session.
2. **Every** Session method takes `agentId` first. There is no session handle hiding it.
3. Assistant text comes from `agent.assistant` via `assistantText()`.
4. **A Session stream does not close at turn end.** Break on `isRunFinished()` yourself.

### 1.4 How model IDs are specified — VERIFIED: **yes, provider-prefixed**

> "Model ids are prefixed, e.g. `litellm/gpt-5.6-terra`."
> — `references/typescript-sdk.md` § Models

Do **not** hardcode one. Select from the catalog:

```ts
const models = await zc.listModels()
const model = models.find(
  (row) => row.selectable !== false && row.default_for?.includes('model'),
)?.model
if (!model) throw new Error('No selectable default ZooWork model')
```

- Filter `row.selectable !== false` **before** any create/update, or the service answers
  `409 model_not_selectable`. A row can stay visible for an existing Agent while `selectable` is false.
- `default_for` names **config slots** (`model`, `imageModel`, `imageGenerationModel`, `pdfModel`),
  **not input modalities** — do not filter it by `'text'`.
- The catalog is **not ordered by preference**. Do not take its first selectable row.
- Set via `resource.model = { primary: string; input?: string[]; max_tokens?: number }`.

### 1.5 Minimal working snippet — defining an agent, session, streaming

Copy-pasteable, from the official skill's own example plus the streaming reference.

```ts
import {
  createZooworkClient, assistantText, thinkingText, toolCall,
  isRunFinished, runOutcome,
} from '@zoowork-ai/sdk'

const zc = createZooworkClient()                       // reads ZOOWORK_API_KEY

// --- setup: ONCE, at boot. Never inside a per-message handler. ---
const models = await zc.listModels()
const model = models.find(
  (r) => r.selectable !== false && r.default_for?.includes('model'),
)?.model
if (!model) throw new Error('No selectable default ZooWork model')

const created = await zc.createAgent({
  resource: {
    name: 'linedown-sourcing',                         // only `name` is required
    model: { primary: model },
    persona: {
      docs: [{ name: 'role', content: 'You are a sourcing agent for a server ODM...' }],
    },                                                 // docs is an ARRAY, not a filename-keyed object
    labels: { app: 'linedown' },
  },
}, 'linedown-sourcing-v1')                             // stable idempotency key
const agentId = created.agent_id                       // PERSIST THIS
await zc.startAgent(agentId)
await zc.waitUntilRunning(agentId)

// --- per conversation ---
const session = await zc.createSession(agentId, {
  initial_events: [{ type: 'user.message', content: 'DDR5 RDIMM allocation alert: assess.' }],
})

const ctl = new AbortController()
const budget = setTimeout(() => ctl.abort(), 120_000)   // a stuck run must not hang the demo
let text = '', cursor: string | undefined, outcome: string | undefined

try {
  for await (const ev of zc.streamEvents(agentId, session.session_id, { signal: ctl.signal })) {
    cursor = ev.cursor ?? cursor                        // opaque resume token — persist it
    text += assistantText(ev)                           // '' for every non-assistant event
    const tool = toolCall(ev)
    if (tool) console.log(tool.phase, tool.toolName)    // 'start' | 'end' | 'blocked'
    if (isRunFinished(ev)) { outcome = runOutcome(ev); break }   // BREAK IS REQUIRED
  }
} finally {
  clearTimeout(budget)
  ctl.abort()                                           // releases the open HTTP body
}
```

Later turns: `postEvents(agentId, sessionId, [{ type: 'user.message', content: '...' }])`, then
re-enter `streamEvents` with `{ cursor }`.

**`SessionEvent` shape** (identical across REST and SSE — the SDK normalizes):

```ts
interface SessionEvent {
  seq: number                  // strictly increasing, NOT contiguous; -1 if unreadable
  eventType: string            // switch on this; there is NO top-level `type`
  payload: Record<string, unknown>   // always an object, {} not undefined; keys camelCase
  runId?: string; turn?: number; createdAt?: string; id?: string
  processedAt?: string | null  // inputs only: null while queued
  cursor?: string              // resume token, present on STREAMED events only
}
```

The 7 event types that carry real integrations — handle these and you render a correct two-sided
chat: `run.started`, `run.finished`, `agent.assistant`, `agent.thinking`, `agent.tool`,
`agent.error`, and the echoed `user.message`. Useful for us too: `agent.custom_tool_use`,
`agent.approval`, `attachment.created`.

Observed live arc: `run.started` → `agent.lifecycle` → `agent.item` → `agent.thinking` →
`agent.assistant` → `agent.tool` (start, end) → `agent.lifecycle` → `run.finished`.

Only **5 writable** `OutboundEvent` types: `user.message`, `user.interrupt`,
`user.tool_confirmation`, `user.custom_tool_result`, `system.message`. All five echo back into the
log, so the log alone renders the whole conversation.

### 1.6 Attaching tools and MCP servers — VERIFIED

Three separate mechanisms. Don't conflate them.

**(a) `custom_tools` — application-executed. THIS IS OUR BLOCK GATE (beat 4).**
Max 32. The run **genuinely pauses** until our backend resolves the call. That is a real
enforced gate, not a social convention — worth saying out loud to a judge.

```ts
custom_tools: [{
  name: 'check_qvl',                   // 1–64 chars: ASCII letters, numbers, _ or -
  description: 'Check a part number against the platform QVL.',   // caps at 4 KiB
  input_schema: { type: 'object', properties: { mpn: { type: 'string' } } },  // caps at 16 KiB
  timeoutMs: 600_000,                  // default 600_000, max 86_400_000
}]
```

Flow: run emits `agent.custom_tool_use` (phase `requested`) → run pauses → read it with
`customToolUse(event)` for normalized `{ callId, toolCallId, name, input, timeout }` →
`resolveCustomToolCall(agentId, callId, { content, isError })` with **1–16** text/JSON/base64-image
blocks. Equivalent write event: `user.custom_tool_result` (`custom_tool_use_id`, or the `call_id`
alias). A pending resolve returns **202** and may carry `signaled: true` while *still pending* until
the run consumes it.

**(b) `mcp` — remote HTTP MCP servers only.**

```ts
interface McpServerDeclaration {
  name: string
  url: string
  transport?: 'streamable-http' | 'sse'
  credential?: string
  toolFilter?: string[]
  exposure?: 'deferred' | 'direct'               // omission default = 'deferred'; there is NO 'auto'
  context?: { meta?: boolean; headers?: boolean }   // both default false
  permission?: 'always_ask' | 'always_allow'
  tools?: Record<string, { permission: 'always_ask' | 'always_allow' }>
}
```

- `deferred` loads tools through `tool_search` / `tool_describe` and keeps them available on later
  turns in the same Session. `direct` declares them on the first model request. Both are
  production-exercised.
- `tools` overrides **exact native MCP tool names** — *before* the `mcp__<server>__<tool>` prefix is
  added. No wildcard keys. Capped at 64 entries.
- **Local/stdio MCP servers are not supported — remote HTTP only.**
- **Authenticated MCP servers cannot be made to work.** `credential` names a slug that is accepted
  and stored, but there is **no endpoint to put the secret it points at**. Declare public servers
  only. (This kills any "point ZooWork at our local Moss MCP" idea — plan around it.)

**(c) `skills` — platform Skill ZIPs.**
`skills: { skill_id: string; version?: number | 'latest' }[]`, or `{ name: 'catalog-skill' }`.
New Agents get global Skills by default; `include_global_skills: false` or an explicit empty array
opts out. Inspect resolved attachments with `listAgentSkills(agentId)`.

**Approvals (human-in-the-loop), if we want the Approve click to be real ZooWork:**
`agent.approval` phase `requested` → `resolveApproval(agentId, approvalId, { decision })` where
decision is `'allow-once' | 'allow-always' | 'deny'`. Associate tool UI by `tool_call_id`; resolve
by `approval_id` — **the two IDs are not interchangeable.** Can return `501 not_configured` on a
deployment with no approval signaler, so have a fallback.

### 1.7 ZooWork gotchas that each cost 20+ minutes — all VERIFIED

1. **`createAgent` and `getAgent` return different shapes** under one `AgentRecord` type.
   Read the version as `agent.status?.config_version ?? agent.config_version` — one alone is
   `undefined` on the other path, and `undefined === undefined` makes a "nothing changed" check
   pass when it should not.
2. **Wait on `desired_state`, never `actual_state`.** `actual_state` is a best-effort chat-channel
   health projection; `'running'` is not even one of its values.
3. **Create Agents serially.** Concurrent `createAgent` in one Organization →
   `503 platform.runtime_credentials_unavailable`, no Agent created. Retry with backoff and the
   same idempotency key.
4. **The stream does not end on its own.** A `for await` that runs to completion blocks until the
   server's idle timeout. Always `break` on `isRunFinished`.
5. **`streamEvents` does not reconnect, retry or back off.** Resuming is your loop calling it again
   with `{ cursor }` from the last event. Abort via `opts.signal` ends it cleanly rather than throwing.
6. **Never derive the cursor from `seq`.** The token is opaque. Without a cursor the stream
   **replays old turns** — which on stage looks exactly like the demo looping.
7. `listEvents()` returns one page and **silently drops pagination metadata**. Use `listAllEvents()`
   for full history, or `listEventsPage()` for explicit cursor paging.
8. **A failed tool call does not necessarily fail the run.** `runOutcome()` is the only verdict.
9. `toolCall().phase` is `start` | `end` | `blocked`. `blocked` ends a call with **no `end` following** —
   inspect the raw payload's `deniedReason`.
10. **`persona.docs` is an array of `{ name, content }`**, not a filename-keyed object. Sending
    `persona.docs` on an update **replaces the whole array**.
11. `updateAgent` merges **per section**. Plain objects shallow-merge one level; nested objects,
    arrays and scalars replace. `tool_policy` and `system_prompt` replace their **entire** sections.
12. **Production rejects `expected_config_version`** on Agent updates with `400 invalid_declared_key`.
    Omit it. GET-then-PUT is not atomic.
13. **Match `ZooworkError.status` and `.type`, never message text.** No error-code constants are
    exported. Two different envelopes: sessions/schedules give bare types (`agent_not_running`),
    agents give dotted (`service_api.not_found`).
14. **A cross-tenant or unknown id returns 404, not 403.** A 404 does not mean deleted.
15. `Session.metadata` is **write-once at `createSession`**. There is no `patchSession` — `PATCH`
    is not proxied at all and answers 405. Mutable per-conversation state goes in our own store.
16. Session run outcome is `run_status` (`null` before the first run). The decoy is `status`:
    `null` on `getSession`, absent from list rows, and carrying `running` only on the create receipt.
17. Tool-policy wildcards: exact name, global `*`, or **one trailing `prefix*`** only. Other star
    placements match nothing. `alsoAllow` is exact-only.
18. `exec(agentId, args)` takes **argv, not a shell string**. `exec(id, ['ls /workspace'])` looks for
    a binary literally named `ls /workspace`; use `['bash','-lc','ls /workspace']`. A non-zero exit
    is **still HTTP 200** — check `exit_code` yourself. Requires `sandbox: { scope: 'agent' }`.
19. **Schedules outlive their agent.** Neither `stopAgent` nor `deleteAgent` removes them. Delete
    schedules → `stopAgent` → `deleteAgent`.
20. Artifacts are published only by the agent's own in-loop `artifact_publish` tool — **there is no
    API to publish one from our code.** Download via `downloadArtifact` (409 before finalization).
21. The production **Database viewer is unavailable** — don't call its SDK helpers or HTTP routes.
22. Project keys **cannot** administer Channels or root Environments (`404 service_api.not_found`).
    Use API Sessions + our own UI. Don't build Channel onboarding.
23. Raw HTTP: the public edge **rejects Python's default `urllib` User-Agent** with `403` and body
    `error code: 1010`. That is not an API-key error. Use the SDK, `curl`, `requests` or `httpx`.

---

## 2. Tavily — search + extract (beat 2)

Source: live official docs, `docs.tavily.com`. All VERIFIED unless marked.

### 2.1 Install + auth — VERIFIED

```bash
npm i @tavily/core          # TS/JS. NOTE: there is no `tavily-js` package
pip install tavily-python   # Python
```

- Env var: `TAVILY_API_KEY`. Key format `tvly-…`, from <https://app.tavily.com>.
- Raw HTTP header: `Authorization: Bearer tvly-YOUR_API_KEY`.
- **Free tier: 1,000 credits/month, no credit card.**
- JS client is the **`tavily()` factory function, not a `TavilyClient` class** (Python uses the class).
- *UNVERIFIED:* whether the current JS SDK auto-reads `TAVILY_API_KEY` with no args. **Pass it explicitly.**

### 2.2 `/search` — VERIFIED

`POST https://api.tavily.com/search`

| Param (HTTP snake_case) | Type | Default | Notes |
|---|---|---|---|
| `query` | string | **required** | |
| `search_depth` | string | `basic` | `basic` \| `advanced` |
| `topic` | string | `general` | `general` \| `news` \| `finance` |
| `max_results` | int | 10 | **range 0–20, hard cap 20** |
| `include_domains` | array | `[]` | max 300 |
| `exclude_domains` | array | `[]` | max 150 |
| `include_raw_content` | bool/string | `false` | `true` \| `markdown` \| `text` |
| `include_answer` | bool/string | `false` | `true` \| `basic` \| `advanced` |
| `time_range` | string | null | `day`/`week`/`month`/`year` or `d`/`w`/`m`/`y` |
| `start_date` / `end_date` | string | null | `YYYY-MM-DD` |
| `chunks_per_source` | int | 3 | range 1–3 |
| `country` | string | null | **boosts, does not restrict** |
| `auto_parameters` | bool | `false` | **costs 2 credits when enabled** |

SDK is **camelCase** (`searchDepth`, `maxResults`, `includeAnswer`, `includeRawContent`,
`timeRange`, `chunksPerSource`, `autoParameters`) while raw HTTP is snake_case. Easy 20-minute trap.

Response: `{ query, answer?, images[], results[], auto_parameters?, response_time, usage?, request_id }`
with `results[]` = `{ title, url, content, score, raw_content?, published_date?, favicon?, id }`.

### 2.3 `/extract` — VERIFIED

`POST https://api.tavily.com/extract`

- `urls`: string **or** array — **1–20 URLs per call**.
- `extract_depth`: `basic` (default) | `advanced` (2× cost).
- `format`: `markdown` (default) | `text`. `include_images`: bool.
- `query` optional, reranks chunks; `chunks_per_source` (1–5) **only works when `query` is set**.
- `timeout`: float 1.0–60.0 s.

Response: `{ results: [{ url, raw_content, images?, favicon? }], failed_results: [{ url, error }], response_time, usage?, request_id }`

### 2.4 Credit costs — VERIFIED (`docs.tavily.com/documentation/api-credits`)

| Operation | Cost |
|---|---|
| `/search` basic | **1 credit** |
| `/search` advanced | **2 credits** |
| `/search` with `auto_parameters: true` | **2 credits** |
| `/extract` basic | **1 credit per 5 successful URLs** (failures free) |
| `/extract` advanced | **2 credits per 5 successful URLs** |
| `/map` | 1 credit/10 pages (2 with instructions) |
| `/crawl` | mapping + extraction combined (~3 credits for 10 pages basic) |
| `/research` | `pro` 15–250, `mini` 4–110 credits/request (dynamic) — **avoid, budget risk** |

Docs do not mention `include_raw_content` or `include_images` affecting cost.
At 1 credit/search on a 1,000-credit free tier, our whole demo is comfortably free.

### 2.5 Snippets — VERIFIED

```ts
import { tavily } from "@tavily/core";
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });

// search
const res = await tvly.search("DDR5 RDIMM spot price allocation", {
  searchDepth: "advanced", topic: "news", maxResults: 5, includeAnswer: "basic",
});
console.log(res.answer);
res.results.forEach(r => console.log(r.title, r.url, r.score));

// extract
const ex = await tvly.extract(["https://example.com/memory-pricing"], {
  extractDepth: "basic", format: "markdown",
});
ex.results.forEach(r => console.log(r.url, r.raw_content.slice(0, 200)));
ex.failed_results.forEach(f => console.log("FAILED", f.url, f.error));   // always check this
```

### 2.6 Tavily gotchas — VERIFIED

- **Rate limits: dev key 100 req/min, production key 1,000 req/min.** Production needs a paid plan
  or PAYGO. A free dev key throttles hard at 100/min.
- **Extract failures are silent** — bad/paywalled/404 URLs land in `failed_results[]` with no
  exception and no credit charge. **Never assume `results.length === urls.length`.**
- `max_results` cap is **20**. Asking for more gets clamped or fails validation.
- Distinct error codes: **432** = key/plan limit exceeded, **433** = PAYGO limit exceeded — these
  are *not* plain 429. A 429 carries `Retry-After`; match status + header, not message text.
- *UNVERIFIED:* default `/extract` timeout value. Set `timeout: 30`+ explicitly when using
  `extract_depth: "advanced"` on heavy pages.
- *UNVERIFIED:* whether `fast` / `ultra-fast` search_depth tiers are GA. Stick to `basic`/`advanced`.

---

## 3. Entire — session provenance + blame (beat 7)

Source: `docs.entire.io`, and `github.com/entireio/cli` (**5,152 stars, pushed today**, real and
actively maintained). The CLI is public OSS; the **hosted web app is the gated/flaky part**.

### 3.1 Install + auth — VERIFIED

```bash
curl -fsSL https://entire.io/install.sh | bash      # 307-redirects to raw.githubusercontent.com/entireio/cli
brew install --cask entireio/tap/entire             # NOTE: a CASK — don't drop --cask
go install github.com/entireio/cli/cmd/entire@latest
entire version                                      # verify
```

- Binaries on PATH: **`entire`** and **`git-remote-entire`**. Default dir `~/.local/bin` (curl path).
- Single static Go binary. **No Node or Python runtime dependency.** Go toolchain needed only for
  `go install`.
- Auth: `entire login` (browser-based). Also `entire logout`, `entire auth` (manage contexts).
- Env: **`ENTIRE_TOKEN`** — JWT for CI/non-interactive, bypasses `entire login`, writes nothing to
  disk. Also `ENTIRE_CONTEXT`. **There is no `ENTIRE_API_KEY`** — don't use that name.
- Install from **`entireio/cli` only.** Near-identically-named unofficial forks exist
  (`autohandai/entrie-cli`, `ItsRoy69/EntireCli`). Don't install those by accident.

### 3.2 Capture a session — VERIFIED (and not what you'd guess)

It is **not** a `entire run claude …` wrapper. It is **git + agent hooks**:

```bash
entire enable -y --agent claude-code     # installs hooks in THIS repo
```

Once enabled, sessions are captured automatically in the background whenever the agent runs.
Session management: `entire session stop | resume [BRANCH] | attach SESSION_ID |
adopt --from SOURCE_WORKTREE | list | current | info | tokens`. There is no documented
`entire session start`.

*UNVERIFIED:* the exact supported-agent name list varied between doc reads. Run
`entire enable --help` to confirm the spelling for our agent before relying on it.

### 3.3 Commit with the session attached — VERIFIED

**It is NOT `entire commit -m "…"`.** You run a **normal `git commit -m "…"`**. A git hook either
prompts interactively — *"Link this commit to session context? [Y]es/[n]o/[a]lways"* — or
auto-attaches, and Entire writes an **`Entire-Checkpoint: <id>` git trailer** into the commit
message. Checkpoint metadata lives on a dedicated ref, **`entire/checkpoints/v1`**. Checkpoint IDs
are ULIDs. The trailer is designed to survive amend/rebase/squash.

### 3.4 The money shot — VERIFIED

```bash
entire blame FILE[:LINE[-LINE]] [flags]
entire blame data/qvl.json
entire blame data/qvl.json --line 12-20
entire blame data/qvl.json --long        # full table: agent, model, author, session
entire blame data/qvl.json --json
```

Per-line attribution tags: `AI` (fully AI), `MX` (mixed AI+human), `HU` (human, no checkpoint),
`??` (uncommitted). Sample:

```
Line  Tag   Agent  Author          Checkpoint    Content
279   [MX]  Codex  blackgirlbytes  bfc2c1df9e4b  document.body.classList.add("leaderboard-route");
```

**To show the actual PROMPT TEXT — which is what the auditor beat needs — use `entire why`, not
`entire blame`:**

```bash
entire why data/qvl.json:12
entire why data/qvl.json --line 12
entire why data/qvl.json:12 --json
```

```
[MX] by Codex - gpt-5.5 - checkpoint bfc2c1df9e4b - session 019edf9f - commit 35cdcfb6
Prompt: "we want to be able to go the route /leaderboard and it renders the leaderboard there"
```

That is literally "which prompt approved this part". **Use `entire why` for beat 7, with
`entire blame` as the visual table alongside it.**

Also exists: `entire checkpoint explain --generate` (LLM-generated explanation), and an
**experimental, separately-installed** `entire investigate` plugin (needs CLI ≥ 0.7.7) for
cross-file correlation — explicitly experimental, **do not use live**.

### 3.5 Shareable blame URL — **UNVERIFIED. BIGGEST DEMO RISK ON THIS SPONSOR.**

- **VERIFIED:** to view in a browser, the repo must be **connected to your Entire account AND
  pushed**. Sessions appear in a "Sessions tab on a checkpoint detail page."
- **VERIFIED absence:** no evidence of a no-login public share link, a `--share` flag, or
  `entire push` / `entire web` commands.
- A URL pattern `entire.io/gh/{owner}/{repo}/trails/{checkpoint_id}` surfaced only via search-engine
  synthesis, **not from a primary doc page**. **UNVERIFIED — do not type this on stage.**
- Closest confirmed shareable artifact: **Dispatches** — "summarize recent agent work into a
  shareable markdown update," with an entire.io web counterpart. Markdown summary, not a blame page.

**Recommendation: demo `entire why` in a terminal, not a hosted page.** That path is VERIFIED
end-to-end. Treat the browser view as a stretch goal only if someone logs in and connects the repo
well before 16:30 and confirms the real URL by clicking through. This also matches cut-ladder item
5 (pre-made screenshot).

### 3.6 Entire gotchas

- **`entire enable` must run BEFORE the agent session starts.** If we forget, there is **no session
  to attach** and beat 7 is dead. **Do this in the repo today, first.**
- Checkpoint data lives on ref `entire/checkpoints/v1`. Sanity-check:
  `git branch -r | grep 'entire/checkpoints/v1'`. Missing on a shallow clone or fresh checkout →
  `blame`/`why` show nothing.
- Local `blame`/`why` **do not** need a remote. The **hosted web view does.** Don't conflate them.
- *UNVERIFIED:* whether a clean git tree is required — not addressed in reachable docs. Test it.
- Recent GitHub issues show trailer-survival edge cases on amend/rebase (#2637, fixes #2582/#2574).
  **Don't amend or rebase the demo commit.**
- Before stage time, run `entire blame --help` and `entire why --help` against the real binary.
  Free, authoritative, 10 seconds, and it settles every flag spelling above.

---

## 4. BAND — multi-agent rooms (beat 4 candidate)

**A real API exists.** No stand-in needed on availability grounds. Source:
`github.com/band-ai/band-sdk-typescript` @ `packages/sdk` v0.5.0, cloned and read.
Note the org is **`band-ai`** (lowercase, hyphenated) — `github.com/Band-AI/band` does not exist.
Platform: <https://app.band.ai>. Sibling repos: `band-sdk-python`, `band-mcp`, `n8n-nodes-band`,
plus demos (`legal-demo`, `support-orchestrator-demo`).

### 4.1 Install + auth — VERIFIED

```bash
pnpm add @band-ai/sdk          # requires Node.js 22+
# then one framework SDK, e.g.
pnpm add @anthropic-ai/sdk
```

Env: **`BAND_AGENT_ID`** + **`BAND_API_KEY`** (the two the README names). Also real in-tree:
`BAND_CHANNEL_ID`, `BAND_WS_URL`, `BAND_REST_URL`, `BAND_API_KEY_USER`.
Config via `loadAgentConfigFromEnv()` or `loadAgentConfig("my_agent")`.

### 4.2 The calls — VERIFIED

```ts
// contracts/protocols.ts:117
interface RoomParticipantTools {
  createChatroom(taskId?: string): Promise<string>
  addParticipant(name: string, role?: string): Promise<ToolOperationResult>
  removeParticipant(name: string): Promise<ToolOperationResult>
  getParticipants(): Promise<ParticipantRecord[]>
}
interface MessagingTools {
  sendMessage(content: string, mentions?: MentionInput): Promise<ToolOperationResult>
  sendEvent(content: string, messageType: string, metadata?: MetadataMap): Promise<ToolOperationResult>
  sendFailure(failure: AgentFailure): Promise<ToolOperationResult>
}
```

```ts
import { Agent, GenericAdapter, loadAgentConfigFromEnv } from "@band-ai/sdk";

const agent = Agent.create({
  adapter: new GenericAdapter(async ({ message, tools, history, roomId }) => {
    await tools.sendMessage(`Echo: ${message.content}`);
  }),
  config: loadAgentConfigFromEnv(),
});
await agent.run();        // long-lived daemon: joins rooms, reacts to messages. NEVER RETURNS.
```

Transcript (`PlatformMessageLike`) — maps cleanly onto `docs/EVENT-SCHEMA.md`:
`{ id, roomId, content, senderId, senderType, senderName, messageType, metadata, createdAt }`.
`history: HistoryLike` is `{ raw: MetadataMap[], length, convert<T>(converter) }`.

### 4.3 **There is no native Critic / veto / blocking primitive** — VERIFIED by exhaustive grep

The complete event vocabulary is five strings (`contracts/chatEvents.ts:3`):

```ts
export const CHAT_EVENT_TYPES = ["tool_call", "tool_result", "thought", "error", "task"] as const;
export const CHAT_MESSAGE_TYPES = ["text", ...CHAT_EVENT_TYPES] as const;
```

No `block`, no `veto`, no `approval`, no `critic`, no gate. Grepped the whole SDK — the only
"block" hits are JS catch-blocks and failure-reporting prose. There is also **no advance-turn /
next-speaker call anywhere**: turn-taking is emergent from chat plus `@mentions`, not a state
machine you step.

So **"a Critic agent that can block" is a prompt-and-convention pattern on BAND, not an enforced
platform primitive.** An agent posts an `error` event and the others are *instructed* to respect
it; nothing halts the room. On stage, "what actually stopped it?" would have to be answered with
"the other model chose to stop."

### 4.4 Verdict and the stand-in

**Beat 4 should not depend on BAND.** Two reasons, both structural rather than about time:

1. No enforced veto (§4.3), and beat 4 is *the* pivotal moment — it must be real.
2. `agent.run()` is a reactive daemon needing a live app.band.ai account with a provisioned agent
   id. There is **no local or offline mode**, and no deterministic sequencing for a 3-minute demo.

**Use instead:** ZooWork `custom_tools` + `resolveCustomToolCall` (§1.6a). The run **genuinely
pauses** in the runtime until our backend resolves the call — a real enforced gate. It also
strengthens the ZooWork prize submission, which is the one with a named prize.

**AGENTS is already building the local orchestrator** (typed turn-taking + blocking Critic +
transcript) and that is the right call. Smallest credible shape, for the record: a typed
`Turn { speaker, role, claim, evidence }` sequence over a fixed participant list; a `Critic` whose
`review(turn) → { verdict: 'pass' | 'block', reason, citation }` short-circuits the sequence on
`block`; and an append-only transcript emitting our existing event schema so UI replay is
unchanged. Deterministic, offline, demo-safe.

**Optional BAND prize surface, additive and zero-risk:** mirror the orchestrator's transcript into
a BAND room via `tools.sendEvent(...)` as a *narration* channel. It cannot break the demo because
nothing depends on its output.

### 4.5 BAND gotchas — each a 20+ minute trap

- **Node 22+** hard requirement. `agent.run()` never returns.
- **`sendEvent` swallows post failures** — resolves `{ ok: false, status: "failed" }` instead of
  throwing, by design, so reporting can't abort a turn. Silent drops.
- **Blank content is rejected platform-side.** Content needs a visible
  `[\p{L}\p{N}\p{P}\p{S}]` character. Whitespace-only, zero-width, and bidi-mark-only strings
  **pass a naive `.trim().length > 0` check** and the platform still rejects them "can't be blank".
- `assertChatEventType` throws on any `messageType` outside those five — **you cannot invent
  `"block"` as an event type.**
- Coding-agent adapters (`CopilotACPAdapter`, `CursorACPAdapter`, `CodexAdapter`, …) spawn **one
  process per room** under `<cwd>/.band-workspaces/<roomId>`. Explicitly **"not a sandbox."**
- TCP transports (`host`/`port`) were **removed**; sessions in an old shared `cwd` fail to restore
  once and replay history into a fresh session.
- `createChatroom` returns just a room id `string`, not a room object.

---

## 5. Moss — covered elsewhere

**Out of RECON scope by assignment.** Owned by the MOSS track (`spikes/moss/`, `status/moss.md`),
with the GO/NO-GO at M1 (14:20). Not researched here — see `status/moss.md`, not this file.

Relevant cross-track note from §1.6b: if the plan was to expose Moss to a ZooWork agent as an MCP
server, **ZooWork supports remote HTTP MCP only, and authenticated MCP servers cannot be made to
work** (no endpoint exists to store the credential the `credential` slug points at). A local/stdio
Moss MCP server will not attach. Either expose it as a public HTTP endpoint or — simpler, and what
I'd suggest with the clock where it is — call Moss from our own backend and hand the result to
ZooWork through a `custom_tools` resolution.

---

## Appendix — fastest path to a working call, per sponsor

| Sponsor | One command to prove auth works |
|---|---|
| ZooWork | `listModels()` — cheap, read-only credential check. **Does not** prove runtime readiness. |
| Tavily | one `/search` basic = 1 credit of 1,000 |
| Entire | `entire version`, then `entire login` |
| BAND | needs a provisioned agent id at app.band.ai first — no offline check exists |

**Repos cloned for this recon** (read-only, in scratchpad, outside the project tree):
`SerendipityOneInc/{zoowork-sdk-skills, zoowork-sdk-typescript, zoowork-agents-docs}`,
`band-ai/{band-sdk-typescript, band-mcp}`.
