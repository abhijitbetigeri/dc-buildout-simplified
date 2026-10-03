/**
 * The orchestrator CLI.
 *
 *   npm run offline            produce a complete 7-beat run with NO keys
 *   npm run run -- --live      use real ZooWork agents (needs ZOOWORK_API_KEY)
 *   npm run capture            refresh data/cache/tavily-*.json from the live API
 *   npm run offline -- --out <path>
 *
 * Output is a wrapper object byte-compatible with data/mock-events.json, so the UI cannot
 * tell a live run from a replay. `validate()` runs before the write, so a malformed run
 * fails here rather than on stage.
 */

import { resolve, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { EventLog } from './events.js';
import { runRoom, type RoomOptions } from './band.js';
import { ScriptedSpeaker } from './speakers.js';
import { loadQvl } from './tools/qvl.js';
import * as tavily from './tools/tavily.js';
import * as moss from './tools/moss.js';
import { buildRevE, commitQvlAmendment, entireStatus } from './tools/entire.js';
import type { HostContext } from './toolhost.js';
import type { Candidate } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

// ── candidates ──────────────────────────────────────────────────────────────

/**
 * Fallback candidate set, used only when data/candidates.json is absent (DATA owns it).
 * Mirrors the agreed scenario: the cheapest is spec-compatible but unqualified, and the
 * broker offer carries the QUALIFIED incumbent part number — so it passes the QVL and must
 * be caught by authenticity instead. Those two facts are what make beats 4 and 5 distinct.
 */
const FALLBACK_CANDIDATES: Candidate[] = [
  {
    id: 'cand-01',
    mpn: 'TRA564G48D436O',
    vendor: 'V-color Technology',
    specs: {
      capacity: '64GB',
      organization: '2Rx4',
      speed: '4800 MT/s (PC5-38400B)',
      formFactor: 'RDIMM 288-pin',
      voltage: '1.1V',
    },
    pricePerUnit: 186.4,
    leadTimeWeeks: 2,
    source: 'V-color authorised reseller — APAC',
  },
  {
    id: 'cand-02',
    mpn: 'MTC20F2085S1RC48BA1',
    vendor: 'Micron (offered via broker — Pacific Rim Components Ltd., HK)',
    specs: {
      capacity: '64GB',
      organization: '2Rx4',
      speed: '4800 MT/s (PC5-38400B)',
      formFactor: 'RDIMM 288-pin',
      voltage: '1.1V',
      lot: 'PRC-24817',
    },
    pricePerUnit: 152.75,
    leadTimeWeeks: 0,
    source: 'Open-market broker, non-franchised — ex-stock Hong Kong',
    broker: true,
    markingText: 'MT 2CC D8BQK MTC20F2085S1RC48BA1 LOT PRC-24817 DC2341',
  },
  {
    id: 'cand-03',
    mpn: 'M321R8GA0BB0-CQK',
    vendor: 'Samsung Semiconductor',
    specs: {
      capacity: '64GB',
      organization: '2Rx4',
      speed: '4800 MT/s (PC5-38400B)',
      formFactor: 'RDIMM 288-pin',
      voltage: '1.1V',
    },
    pricePerUnit: 231.8,
    leadTimeWeeks: 1,
    source: 'Franchised distributor — 5,100 pcs ex-stock, ARO 5 working days',
  },
  {
    id: 'cand-04',
    mpn: 'HMCG94MEBRA109N',
    vendor: 'SK hynix',
    specs: {
      capacity: '64GB',
      organization: '2Rx4',
      speed: '4800 MT/s (PC5-38400B)',
      formFactor: 'RDIMM 288-pin',
      voltage: '1.1V',
    },
    pricePerUnit: 226.5,
    leadTimeWeeks: 14,
    source: 'Franchised distributor — factory order, no stock',
  },
];

async function loadCandidates(): Promise<{ candidates: Candidate[]; source: string }> {
  try {
    const raw = JSON.parse(await readFile(resolve(REPO_ROOT, 'data/candidates.json'), 'utf8')) as unknown;
    const arr = (Array.isArray(raw) ? raw : (raw as { candidates?: unknown[] }).candidates) as Candidate[] | undefined;
    if (!arr?.length) throw new Error('no candidates in file');
    // Tolerate DATA's richer shape. Prefer their explicit channel fields over sniffing prose.
    const candidates = arr.map((c) => ({
      ...c,
      broker:
        c.broker ??
        /broker|grey|non-franchised|open-market|independent/i.test(
          `${c.sourceChannel ?? ''} ${c.vendorTier ?? ''} ${c.source} ${c.vendor}`,
        ),
      lotCode: c.lotCode ?? (c.specs?.lot as string | undefined),
      // DATA pre-normalises specs the way the QVL requirements are keyed — use it when present.
      specs: (c.specsNormalized ?? c.specs) as Record<string, string | number>,
    }));
    return { candidates, source: 'data/candidates.json' };
  } catch {
    return { candidates: FALLBACK_CANDIDATES, source: 'agents/run.ts FALLBACK_CANDIDATES' };
  }
}

// ── the alert ───────────────────────────────────────────────────────────────

const ALERT: RoomOptions['alert'] = {
  part: 'MTC20F2085S1RC48BA1',
  partLabel: '64GB DDR5-4800 RDIMM (2Rx4)',
  program: 'AI-SRV-G4 — 480 node cluster',
  qtyAtRisk: 4608,
  burnRatePerMin: 1240,
  deadlineLabel: 'Build-1 kits due in 11 days',
  reason: 'Supplier cut allocation 40% — DDR5 wafer starts reallocated to HBM',
  plain:
    'Our main memory supplier just said they will ship 40% less than we ordered. We are 4,608 ' +
    'memory modules short, and the factory needs them in 11 days. Every minute without a ' +
    'decision costs about $1,240 in idle line time and late-delivery penalties — roughly ' +
    '$1.8M a day.',
};

// ── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const has = (f: string) => argv.includes(f);
  const valOf = (f: string) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  // ── capture mode: refresh the Tavily cache and exit ────────────────────
  if (has('--capture')) {
    console.log('Capturing Tavily responses to data/cache/ ...');
    const report = await tavily.captureAll(REPO_ROOT);
    for (const [topic, status] of Object.entries(report)) console.log(`  ${topic.padEnd(8)} ${status}`);
    if (!process.env.TAVILY_API_KEY) {
      console.log('\nTAVILY_API_KEY is not set — fixtures were written so the demo never');
      console.log('depends on a live call. Re-run `npm run capture` once a key exists.');
    }
    return 0;
  }

  const live = has('--live');
  const outPath = valOf('--out') ?? resolve(REPO_ROOT, 'data/cache/run-latest.json');

  // Seed the Tavily cache before the run so beat 2 never depends on the network.
  await tavily.captureAll(REPO_ROOT);

  const { candidates, source: candSource } = await loadCandidates();
  const { source: qvlSource } = await loadQvl(REPO_ROOT);

  // Synthetic clock: a recorded run should be deterministic and diffable.
  const log = new EventLog('synthetic');

  const ctx: HostContext = {
    repoRoot: REPO_ROOT,
    log,
    candidates,
    verdicts: new Map(),
    markings: new Map(),
    authenticity: new Map(),
    mossMode: moss.mossKeysPresent() ? 'auto' : 'offline',
    provenance: {},
    fixtures: new Map(),
  };

  // Pull MOSS's own forensic payload up front, if their spike can run.
  const mossCf = await moss.counterfeitPayload(REPO_ROOT, ctx.mossMode);
  if (mossCf) {
    const broker = candidates.find((c) => c.broker);
    if (broker) ctx.mossCounterfeit = { [broker.id]: mossCf };
  }

  let speaker: import('./band.js').Speaker = new ScriptedSpeaker();
  if (live) {
    if (!process.env.ZOOWORK_API_KEY) {
      console.error('--live requires ZOOWORK_API_KEY. Falling back to scripted mode.');
    } else {
      /**
       * The live ZooWork speaker is an UPGRADE PATH, not the demo path, and it is
       * deliberately absent: it cannot be verified without a `ZOOWORK_API_KEY`, and shipping
       * unexercised integration code into a demo is how a run dies on stage.
       *
       * The specifier is built at runtime so the type checker does not demand a module we
       * have chosen not to write. When someone adds `agents/zoowork.ts` exporting a
       * `ZooworkSpeaker` implementing `Speaker`, this picks it up with no other change.
       */
      const spec = './zoowork.js';
      try {
        const mod = (await import(spec)) as { ZooworkSpeaker?: new () => import('./band.js').Speaker };
        if (mod.ZooworkSpeaker) speaker = new mod.ZooworkSpeaker();
        else console.error('zoowork.ts exports no ZooworkSpeaker — staying scripted.');
      } catch {
        console.error('live ZooWork speaker not implemented (agents/zoowork.ts absent) — staying scripted.');
      }
    }
  }

  console.log(`\nLINEDOWN — AGENTS track orchestrator`);
  console.log(`  mode        ${speaker.mode}${live && speaker.mode === 'scripted' ? ' (live requested, no key)' : ''}`);
  console.log(`  candidates  ${candSource} (${candidates.length})`);
  console.log(`  qvl         ${qvlSource}`);
  console.log(`  moss        ${ctx.mossMode}\n`);

  const result = await runRoom(ctx, speaker, {
    alert: ALERT,
    approver: 'Commodity Manager, DRAM — sourcing desk',
    // In the demo the presenter clicks. Headless, approval is granted so a full run records.
    onApproval: async () => true,
  });
  await speaker.teardown?.();

  // ── beat 7: commit the QVL amendment ───────────────────────────────────
  const { qvl } = await loadQvl(REPO_ROOT);
  const winner = candidates.find((c) => c.id === result.approvedCandidate);
  const blockedMpn = candidates.find((c) => result.blockedCandidates.includes(c.id))?.mpn;
  const brokerLot = String(candidates.find((c) => c.broker)?.specs?.lot ?? '') || undefined;

  if (winner) {
    const v = ctx.verdicts.get(winner.id);
    const summary =
      `${winner.vendor} ${winner.mpn} qualified primary alternate` +
      (blockedMpn ? `; ${blockedMpn} blocked pending evaluation` : '') +
      (brokerLot ? `; broker lot ${brokerLot} blacklisted` : '');
    const amendment = buildRevE(qvl, {
      approve: {
        mpn: winner.mpn,
        vendor: winner.vendor,
        specs: winner.specs as Record<string, string | number>,
        validationReportId: v?.validationReportId,
        validatedOn: v?.validatedOn,
        minBiosVersion: v?.minBiosVersion,
      },
      blockedMpn,
      blacklistLot: brokerLot,
    });

    const sessionId = `ld-sess-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const callId = log.toolCall(
      'engineering',
      'entire',
      'Committing QVL rev-E + full decision record',
      'Saving the change to the approved-parts list with a permanent, tamper-evident history entry.',
    );
    const commit = await commitQvlAmendment(REPO_ROOT, amendment, summary, sessionId);
    ctx.provenance['entire'] = `${commit.provenance}${commit.note ? ` (${commit.note})` : ''}`;
    log.toolResult(
      callId,
      'entire.commit',
      {
        commitHash: commit.commitHash,
        blameUrl: commit.blameUrl,
        summary: commit.summary,
        sessionId: commit.sessionId,
      },
      'The approved-parts list is updated, and the change carries a permanent record of which agent session made it and why.',
    );
    log.tick(1200);
    log.policyCommitted({
      commitHash: commit.commitHash,
      blameUrl: commit.blameUrl,
      summary: commit.summary,
      sessionId: commit.sessionId,
      plain:
        'The rule change is now part of the permanent record, not a decision living in ' +
        "somebody's inbox. The commit carries the agent session that made it, so an auditor " +
        'can ask why this part was approved and get the actual reasoning back.',
    });
    log.tick(1500);
  }

  // ── run.ended ──────────────────────────────────────────────────────────
  const qty = ALERT.qtyAtRisk;
  const broker = candidates.find((c) => c.broker);
  const scrapAndRebuild = broker ? Math.round(broker.pricePerUnit * qty * 1.5) : 0;
  const oneDaySlip = Math.round(ALERT.burnRatePerMin * 60 * 24);
  const dollarsSaved = oneDaySlip + scrapAndRebuild;

  log.runEnded({
    outcomeLabel: winner
      ? `Qualified alternate approved — ${qty.toLocaleString()} modules secured, Build-1 kits intact`
      : 'No qualified alternate — escalated',
    dollarsSaved: winner ? dollarsSaved : 0,
    minutesElapsed: Math.round((log.all().at(-1)?.ts ?? 0) / 600) / 100,
    plain: winner
      ? `Outcome: about $${dollarsSaved.toLocaleString()} protected — one avoided day of program ` +
        `slip plus the counterfeit scrap and rebuild we did not buy. By email this takes days, ` +
        `and the factory is idle for every one of them.`
      : 'No safe option was found, so the decision goes back to the supplier rather than into the build.',
  });

  // ── validate, then write ───────────────────────────────────────────────
  const problems = log.validate();
  if (problems.length) {
    console.error('\nSCHEMA VALIDATION FAILED — not writing:');
    for (const p of problems) console.error(`  ${p}`);
    return 1;
  }

  const runId = `ld-run-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  const n = await log.writeRun(outPath, {
    runId,
    program: ALERT.program,
    comment: [
      'LINEDOWN — run produced by the AGENTS track orchestrator (agents/run.ts).',
      `Mode: ${speaker.mode}. Same wrapper shape as data/mock-events.json, so the UI cannot`,
      'tell this from a replay — that interchangeability is the architecture.',
      'The QVL block in this run is computed by agents/tools/qvl.ts#checkQvl against the real',
      'QVL. It is not a scripted string: see agents/tools/qvl.test.ts group 6, which amends the',
      'QVL and shows the same candidate flip from block to pass.',
      `Provenance: ${JSON.stringify(ctx.provenance)}`,
    ],
  });

  // ── report ─────────────────────────────────────────────────────────────
  console.log(`Run complete — ${n} events → ${outPath}`);
  console.log(`  blocked     ${result.blockedCandidates.join(', ') || '(none)'}`);
  console.log(`  rejected    ${result.rejectedCandidates.join(', ') || '(none)'}`);
  console.log(`  approved    ${result.approvedCandidate ?? '(none)'}`);
  console.log('\n  gate:');
  for (const g of result.gates) {
    console.log(
      `    ${g.candidateId}  qvl=${g.qvlPassed ? 'pass' : 'BLOCK'}  auth=${g.authenticityPassed ? 'pass' : 'FAIL'}  eligible=${g.eligible}` +
        (g.blockingReason ? `\n        ${g.blockingReason.slice(0, 120)}` : ''),
    );
  }
  console.log('\n  provenance:');
  for (const [k, v] of Object.entries(ctx.provenance)) console.log(`    ${k.padEnd(16)} ${v}`);

  const es = await entireStatus(REPO_ROOT);
  console.log(`\n  entire: installed=${es.installed} enabled=${es.enabled} loggedIn=${es.loggedIn}`);
  if (!es.loggedIn) console.log('    → `entire login --device` needed for real attribution (beat 7)');

  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
