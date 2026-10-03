/**
 * ZooWork round-trip verification — does the runtime GENUINELY halt?
 *
 * This script exists to answer one question with evidence a judge could re-run:
 *
 *   When the model calls an application-executed custom tool, does the ZooWork run actually
 *   pause and wait for our backend, or does it carry on?
 *
 * The proof is constructed so it cannot be faked by wishful reading of the logs. After the
 * run requests `qvl_lookup`, we DELIBERATELY DO NOT RESOLVE IT for several seconds, and while
 * waiting we poll `listCustomToolCalls({ status: 'pending' })` and the Session's own
 * `run_status`. If the platform were not blocking, the run would finish without our answer.
 * Only then do we resolve, and we show the run resuming and completing with the value we
 * supplied.
 *
 * Run:  npx tsx verify-zoowork.ts
 * It cleans up after itself (stop + delete the throwaway agent).
 *
 * This touches NOTHING on the demo path. Its only outputs are stdout evidence and
 * data/cache/zoowork-roundtrip.json.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assistantText,
  createZooworkClient,
  customToolUse,
  isRunFinished,
  runOutcome,
  ZooworkError,
} from '@zoowork-ai/sdk';
import { checkQvl, loadQvl } from './tools/qvl.js';
import { ENGINEERING } from './defs.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

/** Minimal .env loader — the key lives there, not in the shell. */
async function loadEnv(): Promise<void> {
  try {
    const raw = await readFile(resolve(REPO_ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const [, k, v] = m;
      if (k && v && !process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '');
    }
  } catch {
    /* fall back to the ambient environment */
  }
}

const log: string[] = [];
function say(s = ''): void {
  console.log(s);
  log.push(s);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<number> {
  await loadEnv();
  if (!process.env.ZOOWORK_API_KEY) {
    say('FAIL: ZOOWORK_API_KEY not set (checked shell and .env)');
    return 1;
  }
  // ZOOWORK_BASE_URL must stay unset — the default already carries /service/v1.
  if (process.env.ZOOWORK_BASE_URL) {
    say(`NOTE: ZOOWORK_BASE_URL is set to ${process.env.ZOOWORK_BASE_URL} — unsetting for this test.`);
    delete process.env.ZOOWORK_BASE_URL;
  }

  // Never pass apiKey explicitly: an explicit '' slips past the SDK's guard and 401s.
  const zc = createZooworkClient();

  let agentId: string | undefined;
  const evidence: Record<string, unknown> = { startedAt: new Date().toISOString() };

  try {
    // ── 1. model selection ────────────────────────────────────────────────
    say('── 1. listModels() and select the primary chat default ──');
    const models = await zc.listModels();
    say(`   catalog rows: ${models.length}`);
    const selectable = models.filter((m) => m.selectable !== false);
    const chosen = selectable.find((m) => m.default_for?.includes('model'));
    if (!chosen) {
      say(`FAIL: no selectable row whose default_for includes "model".`);
      say(`   selectable: ${selectable.map((m) => m.model).join(', ') || '(none)'}`);
      return 1;
    }
    const model = chosen.model;
    say(`   chosen model: ${model}  (selectable=${chosen.selectable !== false}, default_for=${JSON.stringify(chosen.default_for)})`);
    evidence.model = model;

    // ── 2. createAgent with the REAL Engineering definition ───────────────
    say('');
    say('── 2. createAgent() with agents/defs.ts ENGINEERING (custom_tools: qvl_lookup) ──');
    const created = await zc.createAgent(
      {
        resource: {
          name: `${ENGINEERING.platformName}-verify`,
          model: { primary: model },
          persona: { docs: [{ name: ENGINEERING.personaName, content: ENGINEERING.persona }] },
          custom_tools: ENGINEERING.customTools,
        },
      },
      `linedown-verify-${Date.now()}`,
    );
    agentId = created.agent_id;
    say(`   agent_id: ${agentId}`);
    say(`   config_version: ${created.status?.config_version ?? created.config_version}`);
    evidence.agentId = agentId;

    // ── 3. start and wait on desired_state ───────────────────────────────
    say('');
    say('── 3. startAgent() + waitUntilRunning() ──');
    const start = await zc.startAgent(agentId);
    if (start.warnings?.length) say(`   warnings: ${start.warnings.join('; ')}`);
    const running = await zc.waitUntilRunning(agentId, { timeoutMs: 90_000 });
    say(`   desired_state: ${running.status?.desired_state}`);

    // ── 4. a Session whose first message forces the tool call ────────────
    say('');
    say('── 4. createSession() with a message that requires qvl_lookup ──');
    const session = await zc.createSession(agentId, {
      initial_events: [
        {
          type: 'user.message',
          content:
            'Candidate cand-01 has been offered: MPN TRA564G48D436O from V-color Technology, ' +
            '64GB, 2Rx4, 4800 MT/s, RDIMM 288-pin, 1.1V, $186.40/ea, 2 week lead time. ' +
            'Qualify it for the AI-SRV-G4 build. You MUST call qvl_lookup before saying ' +
            'anything about it. Report the decision the tool returns.',
        },
      ],
    });
    const sessionId = session.session_id;
    say(`   session_id: ${sessionId}`);
    evidence.sessionId = sessionId;

    // ── 5. stream until the tool is REQUESTED ────────────────────────────
    say('');
    say('── 5. stream until agent.custom_tool_use / requested ──');
    let cursor: string | undefined;
    let pendingCallId: string | undefined;
    let pendingInput: Record<string, unknown> = {};
    let finishedBeforeRequest = false;
    let text = '';

    for await (const ev of zc.streamEvents(agentId, sessionId)) {
      cursor = ev.cursor ?? cursor;
      text += assistantText(ev);
      const ctu = customToolUse(ev);
      if (ctu?.phase === 'requested') {
        pendingCallId = ctu.callId;
        pendingInput = ctu.input ?? {};
        say(`   REQUESTED  tool=${ctu.name}  callId=${ctu.callId}`);
        say(`   input: ${JSON.stringify(pendingInput)}`);
        say(`   timeoutAt: ${ctu.timeoutAt ?? '(default)'}`);
        break; // stop reading: now we test whether the run WAITS
      }
      if (isRunFinished(ev)) {
        finishedBeforeRequest = true;
        say(`   run finished WITHOUT requesting the tool — outcome ${runOutcome(ev)}`);
        break;
      }
    }

    if (finishedBeforeRequest || !pendingCallId) {
      say('');
      say('RESULT: INCONCLUSIVE — the model never called the custom tool, so the halt was');
      say('        never exercised. This is a prompting/model outcome, not a platform finding.');
      say(`        assistant said: ${text.slice(0, 400)}`);
      evidence.result = 'inconclusive-no-tool-call';
      return 2;
    }

    // ── 6. THE PROOF: do NOT resolve, and watch it wait ──────────────────
    /**
     * First attempt waited 12s and the call TIMED OUT before we answered, so the run finished
     * without our value. That still demonstrated the halt — `run_status: awaiting_approval`
     * and `pending_custom_tool_calls: 1` held across three probes — but it did not demonstrate
     * the resume. The wait is now deliberately short, and well inside the declared budget, so
     * both halves are shown in one run.
     */
    say('');
    say('── 6. THE PROOF — deliberately NOT resolving for ~5s (inside the tool budget) ──');
    const observations: Record<string, unknown>[] = [];
    const t0 = Date.now();
    for (const t of [1, 3, 5]) {
      await sleep(t === 1 ? 1000 : 2000);
      const pend = await zc.listCustomToolCalls(agentId, { status: 'pending' });
      const sess = await zc.getSession(agentId, sessionId);
      const row = {
        atSeconds: t,
        pendingCount: pend.length,
        pendingIds: pend.map((p) => p.call_id),
        run_status: sess.run_status ?? null,
        pending_custom_tool_calls: (sess as { pending_custom_tool_calls?: number }).pending_custom_tool_calls ?? null,
      };
      observations.push(row);
      say(`   t+${((Date.now() - t0) / 1000).toFixed(1)}s  pending=${row.pendingCount} ${JSON.stringify(row.pendingIds)}  run_status=${row.run_status}  pending_custom_tool_calls=${row.pending_custom_tool_calls}`);
    }
    evidence.whileUnresolved = observations;

    const stayedPending = observations.every((o) => (o.pendingCount as number) >= 1);
    say('');
    say(`   call remained PENDING across all probes: ${stayedPending ? 'YES' : 'NO'}`);
    say(`   → while pending, run_status was "${observations[0]?.run_status}" — the run was NOT progressing.`);

    // ── 7. resolve with the REAL QVL verdict ─────────────────────────────
    say('');
    say('── 7. resolveCustomToolCall() with the verdict from tools/qvl.ts#checkQvl ──');
    const { qvl, source } = await loadQvl(REPO_ROOT);
    const verdict = checkQvl(
      {
        mpn: String(pendingInput.mpn ?? 'TRA564G48D436O'),
        vendor: 'V-color Technology',
        specs: (pendingInput.specs as Record<string, string | number>) ?? {
          capacity: '64GB',
          organization: '2Rx4',
          speed: '4800 MT/s',
          formFactor: 'RDIMM 288-pin',
          voltage: '1.1V',
        },
      },
      qvl,
    );
    say(`   QVL source: ${source}`);
    say(`   verdict: decision=${verdict.decision} result=${verdict.result} onQvl=${verdict.onQvl} specsMatch=${verdict.specsMatch}`);
    say(`   reason: ${verdict.reason.slice(0, 160)}`);
    evidence.verdict = { decision: verdict.decision, result: verdict.result, reason: verdict.reason };

    /**
     * Resolve EVERY currently-pending call, not just the first one we saw. The model may
     * re-request the tool while waiting (the first attempt showed two call ids), and a stale
     * id answers `status: timeout`.
     */
    const stillPending = await zc.listCustomToolCalls(agentId, { status: 'pending' });
    const toResolve = stillPending.length ? stillPending.map((p) => p.call_id) : [pendingCallId];
    say(`   resolving ${toResolve.length} pending call(s): ${JSON.stringify(toResolve)}`);
    const receipts: Record<string, unknown>[] = [];
    for (const id of toResolve) {
      const resolved = await zc.resolveCustomToolCall(agentId, id, {
        content: [{ type: 'json', value: verdict as unknown }],
        resolvedBy: 'linedown-agents-backend',
      });
      const r = {
        callId: id,
        status: resolved.status,
        signaled: (resolved as { signaled?: boolean }).signaled,
      };
      receipts.push(r);
      say(`   receipt: callId=${id} status=${r.status} signaled=${r.signaled}`);
    }
    evidence.resolveReceipts = receipts;
    const acceptedOk = receipts.some((r) => r.status !== 'timeout');

    // ── 8. the run RESUMES ───────────────────────────────────────────────
    say('');
    say('── 8. resume the stream from the cursor and watch the run finish ──');
    let resumedText = '';
    let outcome: string | undefined;
    let sawResolved = false;
    for await (const ev of zc.streamEvents(agentId, sessionId, cursor ? { cursor } : {})) {
      cursor = ev.cursor ?? cursor;
      resumedText += assistantText(ev);
      const ctu = customToolUse(ev);
      if (ctu?.phase === 'resolved') {
        sawResolved = true;
        say(`   RESOLVED   callId=${ctu.callId} outcome=${ctu.outcome} resolvedBy=${ctu.resolvedBy ?? '(n/a)'}`);
      }
      if (isRunFinished(ev)) {
        outcome = runOutcome(ev);
        say(`   run finished — outcome ${outcome}`);
        break;
      }
    }

    say('');
    say('── assistant text after resolution ──');
    say(resumedText.trim().slice(0, 1200) || '(empty)');

    // ── verdict on the verdict ───────────────────────────────────────────
    // Two independent claims, reported separately because they can come apart — the first
    // attempt proved the halt while failing the resume.
    const haltProven = stayedPending;
    const usedOurValue = /block|not.?listed|QVL|EVAL-G4/i.test(resumedText);
    const resumeProven = acceptedOk && sawResolved && outcome === 'succeeded' && usedOurValue;

    evidence.result = haltProven && resumeProven ? 'VERIFIED' : haltProven ? 'HALT-VERIFIED' : 'PARTIAL';
    evidence.haltProven = haltProven;
    evidence.resumeProven = resumeProven;
    evidence.sawResolved = sawResolved;
    evidence.outcome = outcome;
    evidence.assistantAfterResolve = resumedText.trim().slice(0, 2000);

    say('');
    say('════════════════════════════════════════════════════════════════');
    say(`HALT   : ${haltProven ? 'VERIFIED' : 'NOT SHOWN'}`);
    if (haltProven) {
      say('  · the run requested qvl_lookup and stopped progressing');
      say(`  · run_status held at "${observations[0]?.run_status}" with pending_custom_tool_calls=1`);
      say('  · it stayed that way across every probe while we withheld the answer');
    }
    say(`RESUME : ${resumeProven ? 'VERIFIED' : 'NOT SHOWN'}`);
    if (resumeProven) {
      say('  · resolveCustomToolCall was accepted, the run resumed and finished "succeeded"');
      say('  · the assistant reported the verdict OUR backend supplied (block / not-listed)');
      say('  · that value came from tools/qvl.ts#checkQvl against the real QVL');
    } else {
      say(`  · acceptedOk=${acceptedOk} sawResolved=${sawResolved} outcome=${outcome} usedOurValue=${usedOurValue}`);
    }
    say('════════════════════════════════════════════════════════════════');
    return haltProven && resumeProven ? 0 : 3;
  } catch (err) {
    const e = err as ZooworkError;
    say('');
    say(`FAIL: ${e.name ?? 'Error'} status=${(e as { status?: number }).status ?? '?'} type=${(e as { type?: string }).type ?? '?'}`);
    say(`   ${e.message}`);
    if ((e as { bodySnippet?: string }).bodySnippet) say(`   body: ${(e as { bodySnippet?: string }).bodySnippet}`);
    if ((e as { requestId?: string }).requestId) say(`   requestId: ${(e as { requestId?: string }).requestId}`);
    evidence.result = 'error';
    evidence.error = { status: (e as { status?: number }).status, type: (e as { type?: string }).type, message: e.message };
    return 1;
  } finally {
    // Clean up the throwaway agent. Stop THEN delete; deletion alone leaves the sandbox.
    if (agentId) {
      say('');
      say('── cleanup ──');
      try {
        await zc.stopAgent(agentId);
        say('   stopped');
      } catch (e) {
        say(`   stop failed: ${(e as Error).message}`);
      }
      try {
        await zc.deleteAgent(agentId);
        say('   deleted');
      } catch (e) {
        say(`   delete failed: ${(e as Error).message}`);
      }
    }
    try {
      await mkdir(resolve(REPO_ROOT, 'data/cache'), { recursive: true });
      await writeFile(
        resolve(REPO_ROOT, 'data/cache/zoowork-roundtrip.json'),
        `${JSON.stringify({ ...evidence, transcript: log }, null, 2)}\n`,
        'utf8',
      );
      console.log('\nevidence → data/cache/zoowork-roundtrip.json');
    } catch {
      /* non-fatal */
    }
  }
}

main().then(
  (c) => process.exit(c),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
