# AGENTS track — status

**Owner:** AGENTS · **Writes:** `agents/`, `data/cache/`, this file
**Last update:** 14:05

---

## ENV VARS — export line (copy-paste)

```bash
export ZOOWORK_API_KEY=zwp_live_...      # platform.zoowork.ai → Project API key
export TAVILY_API_KEY=tvly-...
export ENTIRE_TOKEN=...                   # entire.io auth
```

Optional / only if pointing at a non-production deployment:

```bash
export ZOOWORK_BASE_URL=...   # LEAVE UNSET normally. Default already includes /service/v1
```

Notes for whoever exports these:
- There is **no `ZOOWORK_ORG_ID`** — the gateway derives the tenant from the key. Don't bother.
- `ZOOWORK_API_KEY` must be non-empty. An empty string is treated as unset by the SDK env path
  (good), but we never pass `apiKey:` explicitly, so env-only is the safe path.
- MOSS needs no key from us — we call the MOSS track's local spike.

---

## Progress

| Step | State |
|------|-------|
| 1. `npx skills add SerendipityOneInc/zoowork-sdk-skills` | ✅ installed to `.agents/skills/zoowork-managed-agents` |
| 2. Agent definitions (5) | 🔄 |
| 3. BAND room / orchestrator | ⬜ |
| 4. Tool adapters (tavily / moss / entire) | ⬜ |
| 5. Event emission per `docs/EVENT-SCHEMA.md` | ⬜ |

---

## Key architecture findings from the ZooWork skill

**This is the headline for the "Best Use of ZooWork" prize — read this part.**

1. **`resource.custom_tools` is the real mechanism for the Engineering block (beat 4).**
   ZooWork supports up to 32 *application-executed* custom tools per agent. The run emits
   `agent.custom_tool_use` (phase `requested`) and **pauses**; our process resolves the `callId`
   via `resolveCustomToolCall()`. So the QVL lookup is genuinely a function in our process
   reading `data/qvl.json` — the model decides to call it, and the block verdict comes back
   from real data. Not a hardcoded string. This is exactly beat 4.

2. **ZooWork's native approval loop maps onto beat 6 (the Approve click).**
   `agent.approval` / `phase: 'requested'` → `resolveApproval(agentId, approvalId,
   { decision: 'allow-once' })`. Caveat: deployments without an approval signaler answer
   `501 not_configured`, so we keep a schema-level `approval.requested` fallback.

3. **No BAND API in the ZooWork SDK surface.** Nothing named BAND anywhere in the skill
   references. Awaiting RECON's call. Default plan = local orchestrator, per brief.
   Cross-agent collaboration inside ZooWork is done by posting the room transcript into each
   agent's Session as `system.message` + `user.message`.

4. **Lifecycle invariants we must not get wrong** (these are the documented top runtime failures):
   - `createAgent` creates a **stopped** agent → `startAgent()` → `waitUntilRunning()`.
   - Every Session method takes `agentId` first.
   - Assistant text only via `assistantText(event)`.
   - The stream does **not** close at turn end → break on `isRunFinished(event)`.
   - **Create agents serially.** Concurrent `createAgent` in one org →
     `503 platform.runtime_credentials_unavailable`. Five agents = five sequential creates.
   - Resume turns from the last event's opaque `cursor`, never from `seq`.

---

## Blockers

### 1. Node version — RESOLVED (non-blocking)
Local Node is **v20.20.2**, brief said 22.20+. The `npx skills add` install **succeeded anyway**.
The ZooWork TS SDK itself only requires Node 20+. No action needed.

### 2. No sponsor API keys in this environment — EXPECTED, mitigated
`ZOOWORK_API_KEY`, `TAVILY_API_KEY`, `ENTIRE_TOKEN` are all absent. Everything is read from
env vars, and every adapter has a cache/fixture path so the demo runs with zero keys.
See the export line above.
