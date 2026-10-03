# BAND — status

**As of 16:20, 3 Oct 2026.** Owner: BAND spike.

## Current state: BUILT, NOT YET RUN — blocked on credentials

**We cannot currently say "we used BAND."** The integration is written and verified as far as it
can be without a key, but no room exists and no message has been posted. Do not claim otherwise.

| Thing | State |
|---|---|
| `agents/band-room.ts` | Written. Dry-run passes: 36 posts mapped from 55 real events. |
| BAND REST surface | **Verified reachable.** `GET https://app.band.ai/api/v1/agent/me` → `401 {"code":"unauthorized","message":"Missing authentication"}`; with a bogus bearer → `401 "Invalid JWT token"`. Path and auth scheme are correct. |
| Room id | **None.** Nothing posted. |
| `data/cache/band-room.json` | Written, recording the blocked state honestly (`auth.ok: false`, `posted: 0`). |

## The one thing that unblocks this (≈2 minutes, dashboard action)

`.env` has `BAND_API_KEY=` **present but empty**, and no `BAND_AGENT_ID` or `BAND_CHANNEL_ID` at
all. Polled the file for two minutes during the spike; the values never arrived.

1. Register an agent at <https://app.band.ai/agents> → gives an `agent_id` + `api_key` pair.
2. Put `BAND_API_KEY=…` (and `BAND_AGENT_ID=…`) in `.env`.
3. Create a room in the dashboard and set `BAND_CHANNEL_ID=…` — the script will try
   `POST /chats` on its own, but there is **no documented REST create-room endpoint** (the guide
   says rooms come from the dashboard or from an agent's `band_create_chatroom` tool), so the
   dashboard route is the reliable one.
4. `cd agents && npx tsx band-room.ts`

It then prints the room id and writes the full proof (the `/me` response, room id, participant
results, and every server-assigned message id) to `data/cache/band-room.json`.

## Two hazards that shaped the implementation

**Node.** `@band-ai/sdk@0.5.0` declares `engines.node >= 22.12`; this repo runs Node v20.20.2.
A Node 22.22.3 binary does exist on this machine at `~/.hermes/node/bin/node`, and the SDK
installs cleanly under it — but we did not build on the SDK anyway, for a second reason. The
SDK hands room and messaging tools **only** to the adapter callback inside `agent.run()`, which is
a long-lived daemon that never returns — the wrong shape for a one-shot script. So `band-room.ts`
calls the documented REST surface with plain `fetch`: no new dependency, and it runs on the repo's
own Node 20.

**Blank content.** BAND rejects content with no visible character, and whitespace-only /
zero-width / bidi-only strings pass a naive `.trim().length > 0` check and still get rejected
server-side. The script tests for `[\p{L}\p{N}\p{P}\p{S}]` and substitutes a fallback.

## What BAND does and does not do here — the honest paragraph

BAND is a **mirror**, not the orchestrator. `agents/band-room.ts` replays our already-completed run
transcript into a BAND room after the fact: `agent.message` becomes a chat message, `tool.call` and
`tool.result` become `tool_call` / `tool_result` events, and the single `block.raised` is posted as
an **`error`** event — because BAND has no veto, gate, approval or critic primitive at all.
`CHAT_EVENT_TYPES` is exactly `["tool_call","tool_result","thought","error","task"]`, and
`assertChatEventType` throws on anything outside those five, so "block" cannot even be expressed as
an event type. Our actual gate is enforced in ZooWork's runtime via `custom_tools` +
`resolveCustomToolCall`, where the run genuinely pauses until our backend resolves the call, and
our turn-taking is a local state machine in `agents/run.ts` + `agents/speakers.ts`. That is a
deliberate, documented choice (`docs/INTEGRATION.md` §4.3–4.4), not an oversight. **Remove BAND and
nothing about our coordination changes.** BAND's own judging criterion is "make Band essential:
remove it and coordination breaks" — by that standard this integration is *real but not essential*,
and we should say so rather than dress it up. It makes "we posted our run into a BAND room" true;
it does not make BAND load-bearing.

A second, smaller honesty point: BAND seats **registered agents** as participants, by id. Our five
speakers (Intake, Sourcing, Engineering, Quality, Market) are roles inside one agent, not five
registered BAND agents, so `POST /chats/{id}/participants` may well reject them. The script treats
that as non-fatal and attributes every post in its content and `metadata` instead, recording the
per-participant outcome in the proof file either way.

## Recommendation

If the key arrives before submission, run it — a real room id is worth having and costs nothing.
If it does not, **leave the BAND track unselected.** The fallback position is already documented
and defensible: we evaluated BAND, found no enforced veto for the one beat that had to be real,
and chose ZooWork's runtime gate instead. That is a better story than a thin claim.

## Scope note

This spike wrote only `agents/band-room.ts`, `data/cache/band-room.json` and this file. `ui/`,
`data/mock-events.json` and `agents/band.ts` were not touched; the demo path is untouched and the
script imports nothing from it.
