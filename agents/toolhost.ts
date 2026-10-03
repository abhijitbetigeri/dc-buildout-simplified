/**
 * The tool host — the implementations behind every `custom_tools` declaration in defs.ts.
 *
 * This is the hinge of the whole design. In live mode, ZooWork pauses a run at
 * `agent.custom_tool_use` and we resolve it by calling into this file. In offline mode the
 * orchestrator calls exactly the same functions directly. Same code, same data, same
 * verdicts — which is why an offline run is a demonstration of real logic rather than a
 * puppet show, and why `data/mock-events.json` and a run we produce are interchangeable.
 *
 * Every handler also emits the schema events for its beat, so the event log is a faithful
 * record of what the tools actually did rather than a narration written alongside them.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EventLog } from './events.js';
import { checkQvl, loadQvl, type QvlVerdict } from './tools/qvl.js';
import * as moss from './tools/moss.js';
import * as tavily from './tools/tavily.js';
import type { Candidate, QvlLookupPayload } from './types.js';

export interface HostContext {
  repoRoot: string;
  log: EventLog;
  candidates: Candidate[];
  /** accumulated verdicts, consulted by the orchestrator's progression gate */
  verdicts: Map<string, QvlVerdict>;
  /** marking strings transcribed (by the vision model, or from a sidecar) */
  markings: Map<string, string>;
  /** authenticity outcomes per candidate */
  authenticity: Map<string, { ok: boolean; score: number; latencyMs: number; reason: string; plain: string }>;
  mossMode: moss.MossMode;
  provenance: Record<string, string>;
  /** per-candidate marking fixture loaded from data/markings/ */
  fixtures: Map<string, MarkingFixture>;
  /** MOSS's own forensic counterfeit payloads, when their spike produced them */
  mossCounterfeit?: Record<string, Record<string, unknown>>;
}

/** What a custom tool returns to the model, plus what we recorded about it. */
export interface ToolOutcome {
  /** JSON-serialisable result handed back to the agent */
  result: unknown;
  /** image to hand back, when the tool returns pixels (Quality's photo fetch) */
  image?: { media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; data: string };
  isError?: boolean;
}

// ── tavily_search ───────────────────────────────────────────────────────────

async function tavilySearch(ctx: HostContext, input: { topic?: string }): Promise<ToolOutcome> {
  const topic = (input.topic ?? 'pricing') as tavily.Topic;
  const q = tavily.QUERIES[topic] ?? tavily.QUERIES.pricing;
  const callId = ctx.log.toolCall(
    'sourcing',
    'tavily',
    q.label,
    'Searching the open market right now for prices, who has stock, and news about the shortage.',
  );
  const out = await tavily.search(ctx.repoRoot, topic);
  ctx.provenance[`tavily.${topic}`] = out.provenance + (out.note ? ` (${out.note})` : '');
  ctx.log.toolResult(
    callId,
    'tavily.sources',
    { sources: out.sources },
    `Found ${out.sources.length} sources on ${topic === 'pricing' ? 'what modules are selling for' : topic === 'stock' ? 'who has stock and how long delivery takes' : 'why supply is short'}.`,
  );
  return { result: { topic, sources: out.sources, provenance: out.provenance } };
}

// ── moss_partmatch ──────────────────────────────────────────────────────────

async function mossPartmatch(ctx: HostContext, input: { mpn?: string }): Promise<ToolOutcome> {
  const mpn = input.mpn ?? ctx.candidates[0]?.mpn ?? '';
  const callId = ctx.log.toolCall(
    'sourcing',
    'moss',
    'Decoding MPN · searching cross-vendor module equivalents',
    "Reading the supplier's part code to work out exactly what the module is, then finding the same module made by other brands.",
  );
  const out = await moss.findEquivalents(ctx.repoRoot, mpn, ctx.mossMode);
  ctx.provenance['moss.partmatch'] = out.provenance + (out.note ? ` (${out.note})` : '');
  ctx.log.toolResult(
    callId,
    'moss.partmatch',
    out.payload,
    `Found ${out.payload.equivalents.length} equivalent modules from other vendors in ${out.payload.latencyMs}ms — on-device, no round trip to a server.`,
  );
  return { result: out.payload };
}

// ── qvl_lookup — THE GATE ───────────────────────────────────────────────────

/**
 * The pivotal tool. Reads the real QVL and returns a verdict computed field by field.
 *
 * Note what this function does NOT do: it does not decide based on the candidate id, the
 * vendor name, or anything the model said. It calls `checkQvl`, a pure function of
 * (candidate, qvl). Swap the QVL and the answer changes — that property is covered by
 * tools/qvl.test.ts group 6.
 */
async function qvlLookup(
  ctx: HostContext,
  input: { candidateId?: string; mpn?: string; specs?: Record<string, string | number> },
): Promise<ToolOutcome> {
  const { qvl, source } = await loadQvl(ctx.repoRoot);
  ctx.provenance['qvl'] = source;

  // Resolve the candidate: prefer our seeded record (authoritative specs) over model input.
  const known = ctx.candidates.find(
    (c) => c.id === input.candidateId || c.mpn?.toUpperCase() === (input.mpn ?? '').toUpperCase(),
  );
  const candidate = {
    mpn: known?.mpn ?? input.mpn ?? 'UNKNOWN',
    vendor: known?.vendor ?? 'unknown',
    specs: (known?.specs ?? input.specs ?? {}) as Record<string, string | number>,
  };

  const t0 = performance.now();
  const verdict = checkQvl(candidate, qvl);
  const latencyMs = Math.max(1, Math.round(performance.now() - t0));

  const candidateId = known?.id ?? input.candidateId ?? candidate.mpn;
  ctx.verdicts.set(candidateId, verdict);

  const payload: QvlLookupPayload = {
    label: `QVL lookup — ${qvl.platform}`,
    source,
    qvlRevision: verdict.qvlRevision,
    lookups: [
      {
        candidateId,
        mpn: verdict.mpn,
        result: verdict.result,
        validationReportId: verdict.validationReportId,
        validatedOn: verdict.validatedOn,
        minBiosVersion: verdict.minBiosVersion,
        specCompare: verdict.specCompare,
        evaluationQueueId: verdict.evaluationQueueId,
        evaluationStatus: verdict.evaluationStatus,
        note: verdict.note,
      },
    ],
    latencyMs,
  };

  const callId = ctx.log.toolCall(
    'engineering',
    'qvl',
    `QVL lookup — ${qvl.platform} memory, ${verdict.qvlRevision ?? 'current revision'}`,
    'Looking up the official list of memory modules that have actually been tested in this exact server.',
  );
  ctx.log.toolResult(
    callId,
    'qvl.lookup',
    payload,
    verdict.decision === 'block'
      ? 'This part is not on the tested list. Note that it matches the specification perfectly — matching the specification is not the same as having been tested in this server.'
      : 'This part number is on the tested list for this server.',
  );

  return {
    result: {
      candidateId,
      mpn: verdict.mpn,
      platform: verdict.platform,
      qvlRevision: verdict.qvlRevision,
      decision: verdict.decision,
      result: verdict.result,
      onQvl: verdict.onQvl,
      specsMatch: verdict.specsMatch,
      specMismatches: verdict.mismatches,
      reason: verdict.reason,
      plain: verdict.plain,
      note: verdict.note,
      evaluationQueueId: verdict.evaluationQueueId,
      evaluationStatus: verdict.evaluationStatus,
      validationReportId: verdict.validationReportId,
      qualifiedAlternatives: verdict.qualifiedAlternatives,
      latencyMs,
    },
  };
}

// ── fetch_module_photo — returns PIXELS ─────────────────────────────────────

/**
 * The marking fixture DATA ships per lot (`data/markings/*.json`). It is text-first by
 * design: all six counterfeit discriminators are reachable with string/regex/date
 * comparisons, so beat 5 works with no image embedding anywhere in the stack.
 */
interface MarkingFixture {
  fixtureId?: string;
  class?: string;
  claimedMpn?: string;
  lotCode?: string;
  observed?: {
    moduleLabel?: { lines?: string[]; barcodes?: unknown[] };
    dramPackageTopMarking?: { lines?: string[]; fbgaCode?: string; markingMethod?: string };
    [k: string]: unknown;
  };
  findings?: {
    id?: string;
    check?: string;
    severity?: string;
    result?: string;
    plain?: string;
    expected?: string;
    observed?: string;
    method?: string;
  }[];
  verdict?: {
    result?: string;
    confidence?: string;
    findingsFailed?: number;
    findingsTotal?: number;
    similarityScores?: Record<string, number>;
    [k: string]: unknown;
  };
  images?: { label?: string; referenceGenuine?: string; referenceRemarked?: string; [k: string]: unknown };
  comparedAgainst?: string;
  plain?: string;
}

/** Load the lot's marking fixture, if DATA shipped one for this candidate. */
async function loadMarkingFixture(ctx: HostContext, c: Candidate): Promise<MarkingFixture | undefined> {
  const refs = [
    c.markingFixtureRef,
    c.lotCode ? `data/markings/suspect-broker-lot-${c.lotCode}.json` : undefined,
  ].filter(Boolean) as string[];
  for (const r of refs) {
    try {
      return JSON.parse(await readFile(resolve(ctx.repoRoot, r), 'utf8')) as MarkingFixture;
    } catch {
      /* next */
    }
  }
  return undefined;
}

/**
 * Compose the marking string a vision model would transcribe off the label.
 * Both the module label and the DRAM package top marking matter — the counterfeit
 * discriminators live across both (the FBGA code is on the package, the blank serial is on
 * the module label).
 */
function markingFromFixture(f: MarkingFixture): string | undefined {
  const lines = [
    ...(f.observed?.moduleLabel?.lines ?? []),
    ...(f.observed?.dramPackageTopMarking?.lines ?? []),
  ].filter((l): l is string => typeof l === 'string' && l.trim().length > 0);
  return lines.join(' · ').trim() || undefined;
}

const PHOTO_CANDIDATES = (c: Candidate): string[] =>
  [
    c.photoPath,
    c.lotCode ? `data/markings/img/suspect-broker-${c.lotCode}-label.svg` : undefined,
    `data/markings/img/suspect-${c.id}-label.svg`,
    'data/markings/broker-unit-remarked.jpg',
  ].filter(Boolean) as string[];

function mediaTypeFor(path: string): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | undefined {
  if (/\.jpe?g$/i.test(path)) return 'image/jpeg';
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.gif$/i.test(path)) return 'image/gif';
  if (/\.webp$/i.test(path)) return 'image/webp';
  return undefined; // SVG is not an accepted custom-tool image type
}

/**
 * Hand the module photograph to the agent as a base64 image block.
 *
 * ZooWork has no session file-attachment or binary upload API; a custom-tool RESULT is the
 * supported way to get pixels into a turn. If the available asset is an SVG — which is not an
 * accepted image media type — or no photo exists, we degrade to the marking sidecar text and
 * say so, rather than failing the beat.
 */
async function fetchModulePhoto(ctx: HostContext, input: { candidateId?: string }): Promise<ToolOutcome> {
  const c =
    ctx.candidates.find((x) => x.id === input.candidateId) ??
    ctx.candidates.find((x) => x.broker) ??
    ctx.candidates[0];
  if (!c) return { result: { error: 'no such candidate' }, isError: true };

  // The lot's marking fixture is the authoritative record, and it is text-first by design.
  const fixture = await loadMarkingFixture(ctx, c);
  if (fixture) ctx.fixtures.set(c.id, fixture);

  const imagePaths = [
    ...(fixture?.images ? Object.values(fixture.images).filter((v): v is string => typeof v === 'string') : []),
    ...PHOTO_CANDIDATES(c),
  ];

  // Prefer real pixels: that is what lets ZooWork's vision model do the transcription.
  for (const rel of imagePaths) {
    const mt = mediaTypeFor(rel);
    if (!mt) continue; // SVG is not an accepted custom-tool image media type
    try {
      const buf = await readFile(resolve(ctx.repoRoot, rel));
      ctx.provenance['photo'] = `${rel} (${buf.length} bytes, ${mt}) — vision transcription path`;
      return {
        result: {
          candidateId: c.id,
          imagePath: rel,
          instruction:
            'The module photograph follows. Read the top marking and transcribe it exactly as ' +
            'printed — part number, FBGA code, serial, lot and date code. Mark any illegible ' +
            'field as "illegible" rather than guessing.',
        },
        image: { media_type: mt, data: buf.toString('base64') },
      };
    } catch {
      /* try next */
    }
  }

  // No raster photo in an accepted format. Fall back to the recorded marking string.
  // This is the honest path and it loses nothing that matters: every counterfeit
  // discriminator in the fixture is reachable from text, so the finding is identical.
  let marking = c.markingText ?? (fixture ? markingFromFixture(fixture) : undefined);
  if (!marking) {
    for (const p of PHOTO_CANDIDATES(c)) {
      marking = await moss.markingSidecar(ctx.repoRoot, p);
      if (marking) break;
    }
  }
  ctx.provenance['photo'] = marking
    ? `marking supplied as text from ${fixture?.fixtureId ?? 'sidecar'} (no raster image in an accepted format — vision step skipped)`
    : 'no module photo and no marking record found';

  return {
    result: {
      candidateId: c.id,
      imageUnavailable: true,
      markingText: marking ?? null,
      instruction: marking
        ? 'No photograph is available in a readable image format. The marking recorded for this ' +
          'lot is supplied directly — use it verbatim with marking_match.'
        : 'No photograph and no recorded marking for this lot. Report that the check could not be performed.',
    },
    isError: !marking,
  };
}

// ── marking_match ───────────────────────────────────────────────────────────

async function markingMatch(
  ctx: HostContext,
  input: { markingText?: string; candidateId?: string },
): Promise<ToolOutcome> {
  const c =
    ctx.candidates.find((x) => x.id === input.candidateId) ??
    ctx.candidates.find((x) => x.broker) ??
    ctx.candidates[0];
  const markingText = (input.markingText ?? c?.markingText ?? '').trim();
  if (!markingText) return { result: { error: 'no marking text supplied' }, isError: true };

  if (c) ctx.markings.set(c.id, markingText);

  const callId = ctx.log.toolCall(
    'quality',
    'moss',
    'Matching module top-marking, FBGA code and lot/date code against reference lots',
    'Comparing the printing on the memory chips with codes from modules we know are genuine.',
  );
  const out = await moss.matchMarking(ctx.repoRoot, markingText, ctx.mossMode);
  ctx.provenance['moss.matches'] = out.provenance + (out.note ? ` (${out.note})` : '');

  const sorted = [...out.payload.matches].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const genuine = sorted.find((m) => /genuine|reference/i.test(m.label ?? m.id));

  /**
   * The verdict comes from the lot's marking fixture when one exists — six independent
   * findings produced by string, regex and date comparisons against the genuine reference.
   * Those are real checks on real recorded values, which is why this beat survives having
   * no image embedding anywhere in the stack. The Moss score is corroboration and the
   * latency is the thing we show; the fixture's findings are the argument.
   */
  const fixture = c ? ctx.fixtures.get(c.id) : undefined;
  const fails = (fixture?.findings ?? []).filter((f) => /fail/i.test(f.result ?? ''));
  const fixtureSaysCounterfeit = /counterfeit|remark/i.test(
    `${fixture?.class ?? ''} ${fixture?.verdict?.result ?? ''}`,
  );
  const suspect =
    fixtureSaysCounterfeit ||
    fails.length > 0 ||
    /remark|counterfeit|suspect|cluster/i.test(`${top?.id} ${top?.label}`);

  ctx.log.toolResult(
    callId,
    'moss.matches',
    out.payload,
    `Closest match in ${out.payload.latencyMs}ms: ${top?.label ?? 'none'} at ${Math.round((top?.score ?? 0) * 100)}% similarity.`,
  );

  if (c) {
    // Name each failing discriminator. An auditor needs the specific checks, not a score.
    const findingText = fails.length
      ? ` ${fails.length} independent marking failure${fails.length === 1 ? '' : 's'}: ` +
        fails
          .map((f, i) => `(${i + 1}) ${f.id ? `${f.id} — ` : ''}expected ${f.expected ?? 'reference value'}, observed ${f.observed ?? 'mismatch'}`)
          .join('; ') +
        '.'
      : '';
    const findingPlain = fails.length
      ? ' ' + fails.map((f) => f.plain).filter(Boolean).join(' ')
      : '';

    ctx.authenticity.set(c.id, {
      ok: !suspect,
      score: top?.score ?? 0,
      latencyMs: out.payload.latencyMs,
      reason: suspect
        ? `Lot ${c.lotCode ?? c.id} — ${fixture?.verdict?.result ?? 'COUNTERFEIT — REMARKED MODULE'}.` +
          findingText +
          ` Top-marking matches ${top?.label ?? 'a known remarked cluster'} at ${(top?.score ?? 0).toFixed(2)}` +
          (genuine ? `, against only ${genuine.score.toFixed(2)} to the genuine reference` : '') +
          '. Module-level remark: the packages were re-labelled on an already-assembled module, ' +
          'so the die origin is unknown and unverifiable.'
        : `Top-marking "${markingText.slice(0, 60)}" is consistent with the manufacturer reference (${(top?.score ?? 0).toFixed(2)}).`,
      plain: suspect
        ? (fixture?.plain ??
            'The printing on these chips was sanded off and reprinted. They are not the part they claim to be, and we cannot tell what is actually inside them.') +
          findingPlain
        : 'The printing on these chips matches genuine parts.',
    });
  }

  return {
    result: {
      candidateId: c?.id,
      markingText,
      matches: sorted,
      latencyMs: out.payload.latencyMs,
      topMatch: top,
      genuineReferenceScore: genuine?.score,
      verdict: suspect ? 'counterfeit-suspected' : 'consistent-with-genuine',
    },
  };
}

// ── dispatch ────────────────────────────────────────────────────────────────

export type ToolHandler = (ctx: HostContext, input: Record<string, unknown>) => Promise<ToolOutcome>;

export const HANDLERS: Record<string, ToolHandler> = {
  tavily_search: tavilySearch as ToolHandler,
  moss_partmatch: mossPartmatch as ToolHandler,
  qvl_lookup: qvlLookup as ToolHandler,
  fetch_module_photo: fetchModulePhoto as ToolHandler,
  marking_match: markingMatch as ToolHandler,
};

/** Run one custom tool by name. Unknown names are an error the model can read and recover from. */
export async function invokeTool(
  ctx: HostContext,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolOutcome> {
  const h = HANDLERS[name];
  if (!h) {
    return { result: { error: `unknown tool "${name}"`, available: Object.keys(HANDLERS) }, isError: true };
  }
  try {
    return await h(ctx, input);
  } catch (err) {
    return { result: { error: (err as Error).message, tool: name }, isError: true };
  }
}
