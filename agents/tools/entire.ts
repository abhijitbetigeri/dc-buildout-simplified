/**
 * Entire adapter — beat 7, the auditor's answer.
 *
 * Entire CLI 0.11.3 is installed and `entire enable` is active in this repo
 * (`● Enabled · branch master · Agents · Claude Code`). What is NOT available is auth:
 * `entire login` offers only a browser redirect or `--device` code, both of which need a
 * human, and the binary carries no `ENTIRE_*` token env var (grepped — there are none).
 *
 * So this module does the part that works unattended and degrades honestly on the rest:
 *
 *   1. Write the QVL rev-E change to data/cache/ (NOT data/qvl.json — that is the DATA
 *      track's file and cross-track edits are how a repo gets corrupted with an hour left).
 *   2. git commit it, and return the real commit hash.
 *   3. Ask Entire for the prompt behind that line via `entire why <file>:<line> --json`.
 *
 * On the demo: the verified path is running `entire why` in the TERMINAL. There is no
 * evidence of a no-login public share URL, so `blameUrl` is populated with a trail/commit
 * REFERENCE rendered as text, never a live link. A URL that 404s in front of judges is a
 * worse outcome than not having one.
 */

import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { EntireCommit } from '../types.js';
import type { Qvl, QvlEntry } from './qvl.js';

const run = promisify(execFile);

/** `entire` installs to ~/.local/bin, which is not always on a non-login shell's PATH. */
function envWithEntire(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? '';
  return { ...process.env, PATH: `${home}/.local/bin:${process.env.PATH ?? ''}` };
}

async function sh(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; out: string }> {
  try {
    const { stdout } = await run(cmd, args, { cwd, env: envWithEntire(), timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
    return { ok: true, out: stdout.trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') || e.message || 'failed' };
  }
}

export interface EntireStatus {
  installed: boolean;
  enabled: boolean;
  loggedIn: boolean;
  detail: string;
}

export async function entireStatus(repoRoot: string): Promise<EntireStatus> {
  const v = await sh('entire', ['--version'], repoRoot);
  if (!v.ok) return { installed: false, enabled: false, loggedIn: false, detail: 'entire CLI not on PATH' };
  const s = await sh('entire', ['status'], repoRoot);
  const a = await sh('entire', ['auth', 'status'], repoRoot);
  return {
    installed: true,
    enabled: /enabled/i.test(s.out),
    loggedIn: !/not logged in/i.test(a.out),
    detail: `${s.out.split('\n')[0] ?? ''} · ${a.out.split('\n')[0] ?? ''}`,
  };
}

/**
 * Attach the current agent session to Entire and get a checkpoint id.
 *
 * This is the step that makes beat 7's headline claim actually true. Without it, `entire why`
 * resolves the line and author and then says "No Entire checkpoint is linked to the commit
 * that last touched this line" — the capability is real but nothing is linked to our commits.
 *
 * Two non-obvious things, both found by testing rather than from docs:
 *   1. It works with NO login. `entire auth status` reports "Not logged in" throughout and the
 *      attach, checkpoint creation and `why` lookup all succeed locally.
 *   2. `entire enable` landing after the session started does NOT prevent capture. The git
 *      hook never ran for this session, but `session attach <id>` retroactively captures the
 *      transcript anyway. Our earlier assumption that a fresh session would be required was
 *      wrong, and testing it was cheaper than believing it.
 *
 * The commit must then carry an `Entire-Checkpoint: <id>` trailer, which is how the commit and
 * the checkpoint get associated. The CLI prints that trailer for you on attach.
 */
export async function attachSession(repoRoot: string): Promise<string | undefined> {
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID ?? process.env.ENTIRE_SESSION_ID;
  if (sessionId) {
    const r = await sh('entire', ['session', 'attach', sessionId], repoRoot);
    const m = /\b(01[A-Z0-9]{24})\b/.exec(r.out);
    if (m) return m[1];
  }
  // Fall back to the newest existing checkpoint for this branch.
  const list = await sh('entire', ['checkpoint', 'list', '--json'], repoRoot);
  if (list.ok) {
    try {
      const rows = JSON.parse(list.out) as { checkpoint_id?: string }[];
      return rows[0]?.checkpoint_id;
    } catch {
      /* fall through */
    }
  }
  return undefined;
}

/** The rev-E amendment: the approved alternate, plus the blocked and blacklisted entries. */
export function buildRevE(
  base: Qvl,
  opts: { approve: QvlEntry; blockedMpn?: string; blacklistLot?: string },
): Record<string, unknown> {
  return {
    _comment: [
      'QVL rev-E — PROPOSED amendment produced by the LINEDOWN agent run.',
      'Written to data/cache/ by the AGENTS track. This is deliberately NOT data/qvl.json:',
      'that file belongs to the DATA track and cross-track edits corrupt a parallel repo.',
      'Apply by merging `approvedAlternates` and `blocked` into the canonical QVL.',
    ],
    platform: base.platform,
    platformLabel: base.platformLabel,
    supersedes: base.qvlRevision,
    qvlRevision: String(base.qvlRevision ?? 'QVL-G4').replace(/rev-[A-Z]$/, 'rev-E'),
    amendedAt: new Date().toISOString(),
    requirements: base.requirements,
    approvedAlternates: [opts.approve],
    blocked: opts.blockedMpn
      ? [
          {
            mpn: opts.blockedMpn,
            reason: 'Not qualified on this platform — evaluation incomplete',
            revisitWhen: 'validation report issued',
          },
        ]
      : [],
    blacklistedLots: opts.blacklistLot
      ? [{ lot: opts.blacklistLot, reason: 'Counterfeit — module-level remark confirmed' }]
      : [],
  };
}

export interface CommitOutcome extends EntireCommit {
  /** true when the hash came from a real `git commit` in this repo */
  real: boolean;
  /** the prompt text Entire attributes to the change, when auth allows */
  whyText?: string;
  provenance: 'entire+git' | 'git-only' | 'mocked';
  note?: string;
}

/**
 * Commit the QVL amendment with the agent session attached, and return hash + blame ref.
 *
 * Degrades in three steps, each one honest about what it is:
 *   entire+git  — real commit, and `entire why` returned the attributed prompt
 *   git-only    — real commit and real hash, but Entire could not attribute (not logged in)
 *   mocked      — nothing was written; the demo uses the fixture hash and says nothing
 *                 on stage about clicking through
 */
export async function commitQvlAmendment(
  repoRoot: string,
  amendment: Record<string, unknown>,
  summary: string,
  sessionId: string,
): Promise<CommitOutcome> {
  const relPath = 'data/cache/qvl-rev-E.proposed.json';
  const absPath = resolve(repoRoot, relPath);
  const status = await entireStatus(repoRoot);

  const mocked = (note: string): CommitOutcome => ({
    commitHash: '7f3c1ab',
    blameUrl: `entire why ${relPath}:1   (run in the repo — terminal, not a link)`,
    summary,
    sessionId,
    real: false,
    provenance: 'mocked',
    note,
  });

  try {
    await mkdir(resolve(repoRoot, 'data/cache'), { recursive: true });
    await writeFile(absPath, `${JSON.stringify(amendment, null, 2)}\n`, 'utf8');
  } catch (err) {
    return mocked(`could not write ${relPath}: ${(err as Error).message}`);
  }

  // Attach the agent session FIRST, so the commit can carry the checkpoint trailer.
  const checkpointId = await attachSession(repoRoot);

  const add = await sh('git', ['add', '--', relPath], repoRoot);
  if (!add.ok) return mocked(`git add failed: ${add.out}`);

  const msg =
    `QVL rev-E: ${summary}\n\n` +
    `Produced by the LINEDOWN sourcing agent run (session ${sessionId}).\n` +
    `Engineering blocked the cheapest candidate as spec-compatible but not qualified on this\n` +
    `platform; Quality rejected the broker lot on independent marking discriminators.\n` +
    `Proposed amendment — apply into data/qvl.json via the DATA track.\n` +
    // This trailer is what links `entire why` to the originating agent session.
    (checkpointId ? `\nEntire-Checkpoint: ${checkpointId}\n` : '');
  const commit = await sh('git', ['commit', '-m', msg, '--', relPath], repoRoot);
  if (!commit.ok) {
    // Nothing to commit is a legitimate rerun, not a failure — reuse the current HEAD.
    const head = await sh('git', ['rev-parse', '--short', 'HEAD'], repoRoot);
    if (!head.ok) return mocked(`git commit failed: ${commit.out}`);
    return {
      commitHash: head.out,
      blameUrl: `entire why ${relPath}:1`,
      summary,
      sessionId,
      real: true,
      provenance: 'git-only',
      note: `no new changes to commit; reporting HEAD. (${commit.out.split('\n')[0] ?? ''})`,
    };
  }

  const head = await sh('git', ['rev-parse', '--short', 'HEAD'], repoRoot);
  const commitHash = head.ok ? head.out : 'unknown';

  /**
   * Ask Entire why that line exists.
   *
   * Login is NOT required — verified by testing with `entire auth status` reporting
   * "Not logged in" throughout. What IS required is querying a line the trailer-carrying
   * commit actually touched: `why` reports the checkpoint of the commit that last modified
   * that specific line, so an unchanged line still answers "no checkpoint linked". We write
   * `amendedAt` on every run, so line 1 of the amendment is always freshly touched.
   */
  let whyText: string | undefined;
  let provenance: CommitOutcome['provenance'] = 'git-only';
  let note: string | undefined;
  let whyLine = 1;

  // Find a line this commit definitely changed.
  const changed = await sh('git', ['diff', '--unified=0', `${commitHash}~1`, commitHash, '--', relPath], repoRoot);
  const hunk = /@@ -\d+(?:,\d+)? \+(\d+)/.exec(changed.out);
  if (hunk?.[1]) whyLine = Number(hunk[1]);

  if (status.installed && status.enabled) {
    const why = await sh('entire', ['why', `${relPath}:${whyLine}`, '--json'], repoRoot);
    const whyPlain = why.ok ? why : await sh('entire', ['why', `${relPath}:${whyLine}`], repoRoot);
    if (whyPlain.ok && !/No Entire checkpoint is linked/i.test(whyPlain.out)) {
      provenance = 'entire+git';
      try {
        const j = JSON.parse(whyPlain.out) as Record<string, unknown>;
        whyText = (j.prompt as string) ?? (j.intent as string) ?? whyPlain.out.slice(0, 800);
      } catch {
        whyText = whyPlain.out.slice(0, 800);
      }
    } else if (/No Entire checkpoint is linked/i.test(whyPlain.out)) {
      note = `commit made, but no checkpoint linked (checkpointId=${checkpointId ?? 'none'})`;
    } else {
      note = `entire why failed: ${whyPlain.out.split('\n')[0] ?? ''}`;
    }
  }
  if (!status.loggedIn && !note) {
    note = 'not logged in (attribution still works locally; login only needed to sync to origin)';
  }

  return {
    commitHash,
    // A reference the presenter runs in the terminal, rendered as text. Never a hyperlink:
    // there is no evidence of a no-login share URL, and a 404 on stage is the worst outcome.
    blameUrl: `entire why ${relPath}:${whyLine}   @ ${commitHash}`,
    summary,
    sessionId,
    real: true,
    whyText,
    provenance,
    note,
  };
}
