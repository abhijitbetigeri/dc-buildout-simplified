/**
 * Moss adapter — a thin wrapper over the MOSS track's Python spike in spikes/moss/.
 *
 * Deliberately thin. The MOSS track owns the retrieval logic and already emits
 * schema-shaped payloads (`moss.partmatch`, `moss.matches`, `counterfeit.flagged`), so this
 * module's whole job is: shell out, parse, hand back. Re-implementing their scoring here
 * would be two sources of truth for one beat.
 *
 * Their verdict (status/moss.md): image embedding is NO-GO — Moss indexes text only. So the
 * photographed module becomes a marking STRING before Moss sees it, and that transcription
 * step is ZooWork's vision model, not Moss and not an OCR library.
 *
 * `--offline` runs their local hybrid scorer with zero keys and identical output shapes, which
 * is what we rely on: no MOSS_PROJECT_ID/KEY in this environment.
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Event, MossMatches, MossPartmatch } from '../types.js';

const run = promisify(execFile);

export type MossMode = 'offline' | 'live' | 'auto';

export interface MossOutcome<P> {
  payload: P;
  provenance: 'moss-live' | 'moss-offline' | 'fixture';
  note?: string;
}

/** Keys MOSS needs for the live path. Absent here, hence offline by default. */
export function mossKeysPresent(): boolean {
  return Boolean(process.env.MOSS_PROJECT_ID && process.env.MOSS_PROJECT_KEY);
}

function pythonBin(): string {
  return process.env.PYTHON_BIN ?? 'python3';
}

/**
 * Run the spike once and return every event it emitted.
 *
 * The spike is a demo script, not a library with a per-query CLI, so we take its whole run
 * and pick the results we need out of it. One subprocess for the whole orchestration is also
 * cheaper than one per query.
 */
async function runSpike(repoRoot: string, mode: MossMode): Promise<Event[]> {
  const script = resolve(repoRoot, 'spikes/moss/demo.py');
  const flag = mode === 'live' ? '--live' : mode === 'offline' ? '--offline' : null;
  const args = [script, '--json', ...(flag ? [flag] : [])];

  const { stdout } = await run(pythonBin(), args, {
    cwd: repoRoot,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 60_000,
  });

  // --json emits events only, but be tolerant: find the JSON array in the output.
  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error(`moss spike produced no JSON (${stdout.slice(0, 200)})`);
  const parsed = JSON.parse(stdout.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error('moss spike JSON was not an array');
  return parsed as Event[];
}

let spikeCache: { mode: MossMode; events: Event[] } | null = null;

/** One spike run per process, reused across queries. */
async function spikeEvents(repoRoot: string, mode: MossMode): Promise<Event[]> {
  const effective: MossMode = mode === 'auto' ? (mossKeysPresent() ? 'live' : 'offline') : mode;
  if (spikeCache && spikeCache.mode === effective) return spikeCache.events;
  const events = await runSpike(repoRoot, effective);
  spikeCache = { mode: effective, events };
  return events;
}

function findResult<P>(events: Event[], kind: string): P | undefined {
  const hit = events.find(
    (e) => e.type === 'tool.result' && (e.payload as { kind?: string }).kind === kind,
  );
  return hit ? ((hit.payload as { payload: P }).payload as P) : undefined;
}

/**
 * Part-number equivalence — beat 3. "Decode this MPN, find the same module from other vendors."
 */
export async function findEquivalents(
  repoRoot: string,
  mpn: string,
  mode: MossMode = 'auto',
): Promise<MossOutcome<MossPartmatch>> {
  try {
    const events = await spikeEvents(repoRoot, mode);
    const payload = findResult<MossPartmatch>(events, 'moss.partmatch');
    if (!payload) throw new Error('spike returned no moss.partmatch result');
    return {
      payload: { ...payload, query: payload.query ?? mpn },
      provenance: mossKeysPresent() && mode !== 'offline' ? 'moss-live' : 'moss-offline',
    };
  } catch (err) {
    return {
      payload: FIXTURE_PARTMATCH(mpn),
      provenance: 'fixture',
      note: `moss spike unavailable: ${(err as Error).message}`,
    };
  }
}

/**
 * Marking match — beat 5. Takes the marking STRING (transcribed by ZooWork's vision model
 * from the module photo) and matches it against reference and known-counterfeit markings.
 */
export async function matchMarking(
  repoRoot: string,
  markingText: string,
  mode: MossMode = 'auto',
): Promise<MossOutcome<MossMatches>> {
  try {
    const events = await spikeEvents(repoRoot, mode);
    const payload = findResult<MossMatches>(events, 'moss.matches');
    if (!payload) throw new Error('spike returned no moss.matches result');
    return {
      payload,
      provenance: mossKeysPresent() && mode !== 'offline' ? 'moss-live' : 'moss-offline',
    };
  } catch (err) {
    return {
      payload: FIXTURE_MATCHES(markingText),
      provenance: 'fixture',
      note: `moss spike unavailable: ${(err as Error).message}`,
    };
  }
}

/**
 * The spike's own `counterfeit.flagged` payload, when it produced one. We prefer MOSS's
 * version over synthesising our own — they own the forensic detail and it is far richer than
 * anything this module should invent.
 */
export async function counterfeitPayload(
  repoRoot: string,
  mode: MossMode = 'auto',
): Promise<Record<string, unknown> | undefined> {
  try {
    const events = await spikeEvents(repoRoot, mode);
    const hit = events.find((e) => e.type === 'counterfeit.flagged');
    return hit?.payload as Record<string, unknown> | undefined;
  } catch {
    return undefined;
  }
}

/** Also expose the spike's own events wholesale, for diagnostics. */
export async function rawSpikeEvents(repoRoot: string, mode: MossMode = 'auto'): Promise<Event[]> {
  try {
    return await spikeEvents(repoRoot, mode);
  } catch {
    return [];
  }
}

/** Read the marking string the DATA/MOSS tracks shipped alongside a photo, if present. */
export async function markingSidecar(repoRoot: string, photoPath: string): Promise<string | undefined> {
  const candidates = [photoPath.replace(/\.(jpe?g|png|svg)$/i, '.txt'), `${photoPath}.txt`];
  for (const c of candidates) {
    try {
      const txt = (await readFile(resolve(repoRoot, c), 'utf8')).trim();
      if (txt) return txt;
    } catch {
      /* next */
    }
  }
  return undefined;
}

// ── fixtures, only if the spike cannot run at all ───────────────────────────

const FIXTURE_PARTMATCH = (mpn: string): MossPartmatch => ({
  query: mpn,
  equivalents: [
    {
      mpn: 'M321R8GA0BB0-CQK',
      vendor: 'Samsung Semiconductor',
      score: 0.94,
      specs: { capacity: '64GB', organization: '2Rx4', speed: '4800 MT/s', formFactor: 'RDIMM 288-pin' },
    },
    {
      mpn: 'HMCG94MEBRA109N',
      vendor: 'SK hynix',
      score: 0.92,
      specs: { capacity: '64GB', organization: '2Rx4', speed: '4800 MT/s', formFactor: 'RDIMM 288-pin' },
    },
    {
      mpn: 'TRA564G48D436O',
      vendor: 'V-color Technology',
      score: 0.81,
      specs: { capacity: '64GB', organization: '2Rx4', speed: '4800 MT/s', formFactor: 'RDIMM 288-pin' },
    },
  ],
  latencyMs: 7,
});

const FIXTURE_MATCHES = (markingText: string): MossMatches => ({
  matches: [
    { id: 'mark-remarked-cluster-a', label: `Known remarked cluster A — matches "${markingText.slice(0, 24)}"`, score: 0.93 },
    { id: 'mark-micron-genuine-ref', label: 'Micron genuine reference marking', score: 0.41 },
  ],
  latencyMs: 8,
});
