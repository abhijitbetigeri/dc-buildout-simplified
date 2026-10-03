/**
 * agents/band-room.ts — BAND room mirror (one-shot, additive, demo-safe)
 *
 * Posts LINEDOWN's real run transcript into a real BAND room so that "we used BAND"
 * is a verifiable statement backed by a room id and server-assigned message ids.
 *
 * WHAT THIS IS NOT: this is a narration/mirror channel. It does not orchestrate
 * anything. Our turn-taking lives in agents/run.ts + agents/speakers.ts and our
 * block gate is enforced in ZooWork's runtime via custom_tools +
 * resolveCustomToolCall (docs/INTEGRATION.md §1.6a, §4.3-4.4). BAND has no veto
 * primitive — CHAT_EVENT_TYPES is exactly
 * ["tool_call","tool_result","thought","error","task"] — so block.raised is
 * posted as an `error` event, which is how BAND would express a veto.
 *
 * WHY PLAIN fetch AND NOT @band-ai/sdk:
 *   - @band-ai/sdk@0.5.0 declares engines.node >=22.12; this repo runs Node 20.
 *   - The SDK's room/messaging tools are only handed to an adapter callback by
 *     `agent.run()`, which is a long-lived daemon that never returns — wrong
 *     shape for a one-shot script.
 *   The REST surface underneath is documented (band.ai/hacker-guide) and
 *   verified reachable, so we call it directly. Runs on Node 20, no new deps.
 *
 * Run:  cd agents && npx tsx band-room.ts
 *       (--dry-run to print the planned posts without network calls)
 *
 * Writes ONLY data/cache/band-room.json. Touches nothing in the demo path.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const BASE = process.env.BAND_REST_URL?.replace(/\/+$/, '') || 'https://app.band.ai/api/v1/agent'
const OUT = resolve(ROOT, 'data/cache/band-room.json')
const DRY = process.argv.includes('--dry-run')

// ---------------------------------------------------------------- env loading
/** Minimal .env reader — we do not add a dotenv dependency for one script. */
function loadEnv(): void {
  const p = resolve(ROOT, '.env')
  if (!existsSync(p)) return
  for (const raw of readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (v && !process.env[k]) process.env[k] = v
  }
}
loadEnv()

const API_KEY = (process.env.BAND_API_KEY || '').trim()
const AGENT_ID = (process.env.BAND_AGENT_ID || '').trim()
const CHANNEL_ID = (process.env.BAND_CHANNEL_ID || '').trim()

// The five LINEDOWN speakers, in the order the orchestrator seats them.
const PARTICIPANTS: Array<{ key: string; name: string; role: string }> = [
  { key: 'intake', name: 'Intake', role: 'Reads the allocation notice and states the shortfall' },
  { key: 'sourcing', name: 'Sourcing', role: 'Finds substitute parts and live market supply' },
  { key: 'engineering', name: 'Engineering', role: 'Holds the QVL line; raises the block' },
  { key: 'quality', name: 'Quality', role: 'Screens counterfeit and grey-market risk' },
  { key: 'market', name: 'Market', role: 'Pulls spot pricing, stock and allocation news' },
]

// BAND's complete event vocabulary. assertChatEventType throws on anything else,
// so we cannot invent "block" — block.raised must ride as `error`.
const CHAT_EVENT_TYPES = ['tool_call', 'tool_result', 'thought', 'error', 'task'] as const
type ChatEventType = (typeof CHAT_EVENT_TYPES)[number]

interface Posted {
  eventId: string
  type: string
  kind: 'message' | 'event'
  messageType?: ChatEventType
  messageId: string | null
  ok: boolean
  status?: number
  error?: string
}

interface Proof {
  claim: string
  generatedAt: string
  runtime: { node: string; transport: string; base: string }
  sdkNote: string
  auth: { ok: boolean; agent: unknown; error?: string }
  room: { id: string | null; source: string; created: boolean; error?: string }
  participants: Array<{ name: string; role: string; ok: boolean; status?: number; error?: string }>
  participantList: unknown
  transcript: { source: string; totalEvents: number; mapped: number; posted: number; failed: number }
  posted: Posted[]
  limitations: string[]
}

// ------------------------------------------------------------------- http
async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: any; text: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON body kept in `text` */
  }
  return { ok: res.ok, status: res.status, json, text }
}

/** BAND rejects blank content; whitespace/zero-width/bidi-only strings pass a
 *  naive trim check and still 422. Require a real visible character. */
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u
function speakable(s: unknown, fallback: string): string {
  const v = typeof s === 'string' ? s.trim() : ''
  return VISIBLE.test(v) ? v : fallback
}

/** Pull a server-assigned message id out of whatever envelope comes back. */
function messageIdOf(j: any): string | null {
  return j?.id ?? j?.data?.id ?? j?.message?.id ?? j?.message_id ?? j?.messageId ?? null
}

// ------------------------------------------------------------------- main
async function main(): Promise<void> {
  const proof: Proof = {
    claim:
      'LINEDOWN mirrored its real run transcript into a BAND room. BAND carries the ' +
      'narration; it does not orchestrate the run and does not enforce the block.',
    generatedAt: new Date().toISOString(),
    runtime: { node: process.version, transport: 'REST over fetch', base: BASE },
    sdkNote:
      '@band-ai/sdk@0.5.0 requires Node >=22.12 and exposes room tools only inside ' +
      'agent.run(), a daemon that never returns. This repo is Node 20 and needs a ' +
      'one-shot, so we call the documented REST surface directly.',
    auth: { ok: false, agent: null },
    room: { id: null, source: 'none', created: false },
    participants: [],
    participantList: null,
    transcript: { source: 'data/mock-events.json', totalEvents: 0, mapped: 0, posted: 0, failed: 0 },
    posted: [],
    limitations: [],
  }

  // --- transcript: read-only. We never write to mock-events.json. ---
  const rawFile = JSON.parse(readFileSync(resolve(ROOT, 'data/mock-events.json'), 'utf8'))
  const events: any[] = Array.isArray(rawFile) ? rawFile : rawFile.events ?? rawFile.transcript ?? []
  proof.transcript.totalEvents = events.length

  // Map our event schema onto BAND's. Anything not listed stays out of the room.
  type Plan =
    | { ev: any; kind: 'message'; content: string }
    | { ev: any; kind: 'event'; content: string; messageType: ChatEventType }
  const plan: Plan[] = []

  for (const ev of events) {
    const p = ev.payload ?? {}
    const who = p.agent ? String(p.agent) : 'system'
    const label = PARTICIPANTS.find((x) => x.key === who)?.name ?? who

    if (ev.type === 'agent.message') {
      const text = speakable(p.text ?? p.plain, '(no text)')
      plan.push({ ev, kind: 'message', content: `**${label}** — ${text}` })
    } else if (ev.type === 'tool.call') {
      const tool = speakable(p.tool, 'tool')
      const lbl = speakable(p.label ?? p.plain, 'tool call')
      plan.push({
        ev,
        kind: 'event',
        messageType: 'tool_call',
        content: `${label} → ${tool}: ${lbl}`,
      })
    } else if (ev.type === 'tool.result') {
      const kind = speakable(p.kind, 'result')
      // Keep the room readable: summarise the payload rather than dumping it.
      const inner = p.payload ?? {}
      let summary = ''
      if (Array.isArray(inner.sources)) summary = `${inner.sources.length} sources`
      else if (inner._note) summary = String(inner._note)
      else summary = Object.keys(inner).slice(0, 6).join(', ') || 'ok'
      plan.push({
        ev,
        kind: 'event',
        messageType: 'tool_result',
        content: `${kind} — ${summary}`,
      })
    } else if (ev.type === 'block.raised') {
      // THE veto. BAND has no gate primitive, so it lands as an `error` event.
      const reason = speakable(p.reason ?? p.plain, 'blocked')
      plan.push({
        ev,
        kind: 'event',
        messageType: 'error',
        content:
          `BLOCK — ${label} vetoed ${speakable(p.candidateId, 'candidate')}: ${reason}\n\n` +
          `(BAND has no veto primitive; this is posted as an \`error\` event. ` +
          `The gate is actually enforced in ZooWork's runtime and our state machine.)`,
      })
    }
  }
  proof.transcript.mapped = plan.length

  if (DRY) {
    console.log(`[dry-run] ${plan.length} posts planned from ${events.length} events`)
    for (const it of plan.slice(0, 8)) {
      console.log(` ${it.kind}${'messageType' in it ? `/${it.messageType}` : ''}: ${it.content.slice(0, 110)}`)
    }
    console.log(` ... and ${Math.max(0, plan.length - 8)} more`)
    return
  }

  // --- credentials gate: fail loudly and specifically. ---
  if (!API_KEY) {
    proof.auth.error =
      'BAND_API_KEY is empty in .env. Register an agent at https://app.band.ai/agents ' +
      'to get the agent_id + api_key pair.'
    proof.limitations.push('NOT RUN: no BAND_API_KEY.')
    persist(proof)
    console.error(`\n  BLOCKED: ${proof.auth.error}\n`)
    process.exitCode = 2
    return
  }

  // --- 1. GET /me — cheapest proof the key works. ---
  const me = await api('GET', '/me')
  proof.auth.ok = me.ok
  proof.auth.agent = me.json ?? me.text.slice(0, 400)
  if (!me.ok) {
    proof.auth.error = `GET /me -> ${me.status}: ${me.text.slice(0, 200)}`
    proof.limitations.push('NOT RUN: credentials rejected.')
    persist(proof)
    console.error(`\n  BLOCKED: ${proof.auth.error}\n`)
    process.exitCode = 2
    return
  }
  console.log(`[band] authenticated: ${JSON.stringify(me.json).slice(0, 160)}`)

  // --- 2. room. Prefer a dashboard-provided id; else try to create one. ---
  if (CHANNEL_ID) {
    proof.room = { id: CHANNEL_ID, source: 'BAND_CHANNEL_ID', created: false }
  } else {
    const created = await api('POST', '/chats', { task_id: `linedown-${Date.now()}` })
    if (created.ok) {
      const id = created.json?.id ?? created.json?.data?.id ?? created.json?.chat?.id ?? null
      proof.room = { id, source: 'POST /chats', created: true }
    } else {
      proof.room = {
        id: null,
        source: 'none',
        created: false,
        error: `POST /chats -> ${created.status}: ${created.text.slice(0, 200)}`,
      }
    }
  }
  if (!proof.room.id) {
    proof.limitations.push(
      'No room id. Set BAND_CHANNEL_ID from a room created at https://app.band.ai, ' +
        'or have the agent create one via the band_create_chatroom tool.',
    )
    persist(proof)
    console.error(`\n  BLOCKED: no room id. ${proof.room.error ?? ''}\n`)
    process.exitCode = 3
    return
  }
  const room = proof.room.id
  console.log(`[band] room: ${room} (${proof.room.source})`)

  // --- 3. participants. Non-fatal: BAND seats registered agents, and our five
  //        speakers are roles inside one agent, so this can legitimately fail.
  for (const p of PARTICIPANTS) {
    const r = await api('POST', `/chats/${room}/participants`, {
      participant_id: p.key,
      name: p.name,
      role: p.role,
    })
    proof.participants.push({
      name: p.name,
      role: p.role,
      ok: r.ok,
      status: r.status,
      error: r.ok ? undefined : r.text.slice(0, 160),
    })
    console.log(`[band] participant ${p.name}: ${r.ok ? 'added' : `skipped (${r.status})`}`)
  }
  if (proof.participants.every((p) => !p.ok)) {
    proof.limitations.push(
      'No participants could be added: BAND seats registered agents by id, and our five ' +
        'speakers are roles within a single agent. Each post is therefore attributed in ' +
        'its content and metadata instead.',
    )
  }

  const list = await api('GET', `/chats/${room}/participants`)
  proof.participantList = list.ok ? list.json : `GET -> ${list.status}: ${list.text.slice(0, 200)}`

  // --- 4. replay the transcript, in order. ---
  for (const it of plan) {
    const meta = {
      linedown_event_id: String(it.ev.id ?? ''),
      linedown_event_type: String(it.ev.type ?? ''),
      linedown_agent: String(it.ev.payload?.agent ?? 'system'),
      linedown_ts: String(it.ev.ts ?? ''),
    }
    let r
    if (it.kind === 'message') {
      r = await api('POST', `/chats/${room}/messages`, { content: it.content, metadata: meta })
    } else {
      r = await api('POST', `/chats/${room}/messages`, {
        content: it.content,
        message_type: it.messageType,
        metadata: meta,
      })
    }
    // sendEvent-style posts resolve {ok:false} rather than throwing; treat a
    // non-2xx or an {ok:false} envelope as a failure so the count stays honest.
    const envelopeOk = r.ok && r.json?.ok !== false && r.json?.status !== 'failed'
    proof.posted.push({
      eventId: String(it.ev.id ?? ''),
      type: String(it.ev.type ?? ''),
      kind: it.kind,
      messageType: it.kind === 'event' ? it.messageType : undefined,
      messageId: messageIdOf(r.json),
      ok: envelopeOk,
      status: r.status,
      error: envelopeOk ? undefined : r.text.slice(0, 160),
    })
    if (envelopeOk) proof.transcript.posted++
    else proof.transcript.failed++
  }

  proof.limitations.push(
    'BAND is a mirror here, not the orchestrator. Turn-taking is agents/run.ts + ' +
      'agents/speakers.ts; the block gate is enforced in ZooWork via custom_tools + ' +
      'resolveCustomToolCall. Remove BAND and the run still works.',
    'block.raised is posted as an `error` event because BAND has no veto/gate primitive ' +
      '(CHAT_EVENT_TYPES has exactly five values and none of them is a block).',
  )

  persist(proof)
  console.log(
    `\n[band] DONE room=${room} posted=${proof.transcript.posted}/${proof.transcript.mapped} ` +
      `failed=${proof.transcript.failed}\n[band] proof -> data/cache/band-room.json\n`,
  )
}

function persist(proof: Proof): void {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(proof, null, 2) + '\n', 'utf8')
}

main().catch((err) => {
  console.error('[band] fatal:', err?.message ?? err)
  process.exitCode = 1
})
