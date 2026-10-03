# RECON status — M2 COMPLETE ✅

**Deliverable:** `docs/INTEGRATION.md` — delivered 14:18, ahead of the 14:25 gate.
**AGENTS unblocked:** yes — BAND verdict sent direct at 14:05, before the doc landed.

Evidence labels: **VERIFIED** = read real docs or real SDK source. **UNVERIFIED** = inferred.

| Sponsor | Status | Evidence basis |
|---|---|---|
| **ZooWork** | ✅ **VERIFIED** | Full SDK source + skill references + docs site, all cloned and read |
| **Tavily** | ✅ **VERIFIED** | Live official docs (docs.tavily.com), 7 pages |
| **Entire** | ✅ **VERIFIED** (CLI) / ⚠️ **UNVERIFIED** (hosted blame URL) | docs.entire.io + github.com/entireio/cli |
| **BAND** | ✅ **VERIFIED** | Full SDK source cloned and grepped — real API found |
| **Moss** | ➖ n/a | Owned by MOSS track. Not in RECON scope. One cross-track warning below. |

---

## The four things worth knowing before you read the doc

1. **ZooWork model IDs DO need provider prefixes** — e.g. `litellm/gpt-5.6-terra`. Don't hardcode:
   select from `listModels()` filtering `row.selectable !== false && row.default_for?.includes('model')`,
   or you get `409 model_not_selectable`. (VERIFIED)

2. **BAND has rooms but NO native Critic/veto primitive.** The whole event vocabulary is five
   strings — `tool_call`, `tool_result`, `thought`, `error`, `task`. No block, no veto, no gate, and
   no advance-turn call. A BAND "Critic that blocks" is prompt-and-convention; nothing halts the
   room. Beat 4 must not depend on it. (VERIFIED by exhaustive grep of v0.5.0 source)

3. **Our real block gate is ZooWork `custom_tools`.** The run *genuinely pauses* until our backend
   calls `resolveCustomToolCall`. Enforced by the runtime, not social — and it strengthens the one
   submission with a named prize. This is the recommendation for beat 4.

4. **For beat 7, the command is `entire why`, not `entire blame`.** `blame` gives a per-line
   attribution table; **`why` prints the actual prompt text**, which is what the auditor beat needs.
   `entire why data/qvl.json:12` → `Prompt: "..."`. (VERIFIED)

## Two things that will cost someone an hour if they don't read them

- ⚠️ **`entire enable -y --agent claude-code` must run BEFORE the agent session starts.** It is a
  git-hook install, not a `entire run` wrapper. Miss it and there is no session to attach — beat 7
  is simply dead with no recovery. **Needs doing in the repo today, early.** Also: commit with a
  normal `git commit`, NOT `entire commit` (which isn't a command).
- ⚠️ **ZooWork cannot attach a local/stdio or authenticated MCP server.** Remote HTTP only, and the
  `credential` slug is accepted but there is **no endpoint to store the secret it points at**. If
  anyone planned to expose Moss to a ZooWork agent over MCP, that will not work. Call Moss from our
  own backend and feed the result in via a `custom_tools` resolution instead. → flagged to MOSS/AGENTS.

## Honest gaps — do not build on these

- **Entire hosted shareable blame URL: UNVERIFIED, and it's the biggest per-sponsor demo risk.**
  No evidence of a public no-login share link, a `--share` flag, or `entire push`/`entire web`.
  The browser view provably requires an account + a connected, pushed repo. A URL pattern
  (`entire.io/gh/{owner}/{repo}/trails/{id}`) surfaced only via search-engine synthesis, never from
  a primary doc page — **do not type it on stage.** Plan the terminal path; that one is VERIFIED
  end-to-end. Matches cut-ladder item 5.
- **Entire `--agent` supported-value list: UNVERIFIED.** Spelling varied between doc reads. Run
  `entire enable --help` (free, 10s, authoritative).
- **Tavily:** default `/extract` timeout value UNVERIFIED (set `timeout: 30`+ explicitly on
  `advanced`); whether `fast`/`ultra-fast` search depths are GA UNVERIFIED (stick to basic/advanced);
  whether the JS SDK auto-reads `TAVILY_API_KEY` UNVERIFIED (pass it explicitly).
- **Entire:** clean-git-tree requirement not addressed in reachable docs. Untested either way.
- **ZooWork:** `agent.command_output`, `agent.patch`, `agent.compaction`, `attachment.created`,
  `message.outbound` are documented but *not* driven end-to-end through the public API. Code
  defensively against their payload fields. The 7 types with real integrations are listed in the doc.

## Budget notes

- **Tavily free tier is 1,000 credits/month**; basic search is 1 credit, advanced 2, extract 1 per 5
  URLs. Our whole demo is comfortably free. **Avoid `/research`** — 15–250 credits per request.
- Dev-key rate limit is 100 req/min. Fine for us.

## Timeline

- 13:55 — Cloned 3 ZooWork repos + 2 BAND repos. Chose source-reading over doc-fetching for ground truth.
- 13:55 — BAND org is **`band-ai`** (lowercase), not `Band-AI/band`. Real TS+Python SDKs, TS pushed today.
  No 15-minute-timeout stand-in needed — a real API exists; it just lacks the veto primitive.
- 14:00 — Tavily + Entire delegated to parallel subagents; both returned VERIFIED findings.
- 14:05 — **BAND verdict sent to AGENTS** (unblocked them on their pivotal decision, 20 min early).
  They were already on the local-orchestrator fallback; I confirmed that's correct and told them to stay.
- 14:18 — `docs/INTEGRATION.md` complete: 5 sponsors, install + auth + signatures + snippets + gotchas.

## Files touched

- `docs/INTEGRATION.md` (created)
- `status/recon.md` (this file)

Nothing else. No cross-track edits. Repos cloned read-only into the session scratchpad, outside the
project tree.
