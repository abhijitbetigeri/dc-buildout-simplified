/**
 * ScriptedSpeaker — the no-key path.
 *
 * This is NOT a mock of the decision. It calls exactly the same `invokeTool` handlers the
 * ZooWork agents call, so every verdict in a scripted run comes out of the real QVL engine
 * and the real Moss index. What is scripted is the prose: instead of a model composing the
 * sentence, a template composes it *from the tool's actual output*.
 *
 * Which means the interesting property holds in both modes: change the QVL, and a scripted
 * run changes its mind too. Nothing here can say "blocked" unless `checkQvl` said so.
 */

import type { AgentDef } from './defs.js';
import type { Speaker, Turn } from './band.js';
import { invokeTool, type HostContext } from './toolhost.js';

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Every composed turn ends with a "Plain version:" clause. Split it into the schema's `text`
 * and `plain` fields rather than shipping one blob: the UI renders `plain` as a subtitle, and
 * EventLog.validate() now fails any event that lacks one.
 */
function split(composed: string): { text: string; plain: string } {
  const i = composed.indexOf('Plain version:');
  if (i === -1) return { text: composed.trim(), plain: composed.trim() };
  return {
    text: composed.slice(0, i).trim(),
    plain: composed.slice(i + 'Plain version:'.length).trim(),
  };
}

export class ScriptedSpeaker implements Speaker {
  readonly mode = 'scripted' as const;

  async speak(agent: AgentDef, _brief: string, _instruction: string, ctx: HostContext): Promise<Turn> {
    const tools: Turn['tools'] = [];
    const record = (name: string, input: Record<string, unknown>, summary: string) =>
      tools.push({ name, input, summary });

    switch (agent.key) {
      case 'intake':
        return { agent: 'intake', role: agent.role, tools, ...split(this.intake(ctx)) };

      case 'sourcing': {
        // Real searches, real part-number decode.
        for (const topic of ['pricing', 'stock', 'news'] as const) {
          const out = await invokeTool(ctx, 'tavily_search', { topic });
          const r = out.result as { sources?: unknown[] };
          record('tavily_search', { topic }, `${r.sources?.length ?? 0} sources`);
        }
        const pm = await invokeTool(ctx, 'moss_partmatch', { mpn: ctx.candidates[0]?.mpn ?? '' });
        const pmr = pm.result as { equivalents?: unknown[]; latencyMs?: number };
        record('moss_partmatch', {}, `${pmr.equivalents?.length ?? 0} equivalents in ${pmr.latencyMs}ms`);
        return { agent: 'sourcing', role: agent.role, tools, ...split(this.sourcing(ctx, pmr.latencyMs ?? 0)) };
      }

      case 'engineering': {
        // Second Engineering turn: the verdicts already exist, so close out instead.
        if (ctx.verdicts.size > 0) {
          return { agent: 'engineering', role: agent.role, tools, ...split(this.engineeringClose(ctx)) };
        }
        // First turn: look EVERY candidate up. This is the gate being exercised.
        for (const c of ctx.candidates) {
          const out = await invokeTool(ctx, 'qvl_lookup', {
            candidateId: c.id,
            mpn: c.mpn,
            specs: c.specs,
          });
          const r = out.result as { decision?: string };
          record('qvl_lookup', { candidateId: c.id, mpn: c.mpn }, `${r.decision}`);
        }
        return { agent: 'engineering', role: agent.role, tools, ...split(this.engineeringBlock(ctx)) };
      }

      case 'quality': {
        const broker = ctx.candidates.find((c) => c.broker) ?? ctx.candidates[0];
        if (!broker)
          return {
            agent: 'quality',
            role: agent.role,
            tools,
            text: 'No non-franchised offers to screen.',
            plain: 'Every offer came through an official distributor, so there is nothing for me to check.',
          };

        const photo = await invokeTool(ctx, 'fetch_module_photo', { candidateId: broker.id });
        const pr = photo.result as { markingText?: string | null; imageUnavailable?: boolean };
        record('fetch_module_photo', { candidateId: broker.id }, photo.image ? 'image returned' : 'marking text only');

        // In live mode the vision model transcribes the image. With no key, we use the
        // marking string the DATA/MOSS tracks shipped. Honest either way — and the beat's
        // value is the match and the latency, not the transcription step.
        const markingText = pr.markingText ?? broker.markingText ?? '';
        const mm = await invokeTool(ctx, 'marking_match', { candidateId: broker.id, markingText });
        const mr = mm.result as { verdict?: string; latencyMs?: number; topMatch?: { score: number } };
        record('marking_match', { markingText }, `${mr.verdict} in ${mr.latencyMs}ms`);

        return { agent: 'quality', role: agent.role, tools, ...split(this.quality(ctx, broker.id, markingText)) };
      }

      default:
        return { agent: agent.key, role: agent.role, tools, text: '', plain: '' };
    }
  }

  // ── turn composition, all of it from real tool output ─────────────────────

  private intake(ctx: HostContext): string {
    const n = ctx.candidates.length;
    return (
      `Allocation alert confirmed and normalised. Our qualified primary RDIMM is short against ` +
      `the AI-SRV-G4 build and the supplier has reallocated wafer starts to HBM, so this is a ` +
      `supply decision, not a price negotiation. ` +
      `Room order: Sourcing brings alternates, Engineering qualifies them against the platform ` +
      `QVL and may block, Quality screens any non-franchised offer for authenticity, then a ` +
      `human approves. ${n} candidate${n === 1 ? '' : 's'} to work through. ` +
      `Plain version: our main memory supplier will ship far less than we ordered, the factory ` +
      `needs the parts in days, and every minute we spend deciding costs us idle-line and ` +
      `late-delivery money.`
    );
  }

  private sourcing(ctx: HostContext, latencyMs: number): string {
    const sorted = [...ctx.candidates].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    const cheapest = sorted[0];
    const fastFranchised = sorted.find((c) => !c.broker && c.leadTimeWeeks <= 2);
    return (
      `Decoded the at-risk part number and pulled cross-vendor equivalents in ${latencyMs}ms, ` +
      `then checked pricing, distributor stock and allocation news. ${ctx.candidates.length} ` +
      `offers on the table. ` +
      `Cheapest is ${cheapest?.vendor} ${cheapest?.mpn} at ${money(cheapest?.pricePerUnit ?? 0)} a ` +
      `module, ${cheapest?.leadTimeWeeks} week(s) out — same specification on paper, and I want ` +
      `it considered seriously because the delta across the full quantity is real money. ` +
      (fastFranchised
        ? `The safe option is ${fastFranchised.vendor} ${fastFranchised.mpn} at ` +
          `${money(fastFranchised.pricePerUnit)}, in stock at a franchised distributor. `
        : '') +
      `Plain version: I found several replacements. The cheapest looks identical on the ` +
      `datasheet; the dearest one is in stock with full paperwork. Engineering's call now — ` +
      `I am not claiming any of these is approved.`
    );
  }

  private engineeringBlock(ctx: HostContext): string {
    const blocked = ctx.candidates.filter((c) => ctx.verdicts.get(c.id)?.decision === 'block');
    const passed = ctx.candidates.filter((c) => ctx.verdicts.get(c.id)?.decision === 'pass');
    const headline = blocked
      .map((c) => {
        const v = ctx.verdicts.get(c.id)!;
        return `${c.vendor} ${c.mpn} is BLOCKED — ${v.reason}`;
      })
      .join(' ');

    const specCompatibleBlock = blocked.find((c) => ctx.verdicts.get(c.id)?.specsMatch);
    const lesson = specCompatibleBlock
      ? ` I want to be precise about why I am blocking the cheapest option, because it will ` +
        `look unreasonable: it matches every platform requirement. It is still blocked. The QVL ` +
        `is a record of what has been TESTED in this machine, not a list of what fits. ` +
        `Spec-compatible is not qualified. Nobody has run a full chassis of these at thermal ` +
        `load, and discovering the problem during a customer's burn-in is how we lose the ` +
        `cluster and the contract.`
      : '';

    return (
      `Ran the platform QVL lookup on all ${ctx.candidates.length} candidates. ${headline}${lesson} ` +
      (passed.length
        ? ` Qualified and available to us: ${passed.map((c) => `${c.vendor} ${c.mpn}`).join(', ')}. `
        : ' No candidate is qualified. ') +
      `Plain version: the cheapest memory was never tested in this server, so I will not let it ` +
      `into the build. These other parts were tested, and we should buy one of them. ` +
      `One caveat for Quality: the QVL clears a part NUMBER. It says nothing about whether a ` +
      `particular seller's units are genuine.`
    );
  }

  private quality(ctx: HostContext, brokerId: string, markingText: string): string {
    const a = ctx.authenticity.get(brokerId);
    const broker = ctx.candidates.find((c) => c.id === brokerId);
    if (!a || a.ok) {
      return (
        `Screened the non-franchised offer. Top marking "${markingText}" is consistent with the ` +
        `manufacturer reference. No authenticity objection from me. ` +
        `Plain version: the printing on these chips matches genuine parts.`
      );
    }
    return (
      `Rejecting the broker lot${broker ? ` from ${broker.source}` : ''}. ${a.reason} Matched in ` +
      `${a.latencyMs}ms, on-device. ` +
      `Note that this part number PASSED Engineering's qualification check — that is exactly the ` +
      `point. Qualification and authenticity are independent, and the part being on the QVL is ` +
      `what makes a remarked unit worth faking. ` +
      `Plain version: ${a.plain}`
    );
  }

  private engineeringClose(ctx: HostContext): string {
    const lines: string[] = [];
    for (const c of ctx.candidates) {
      const v = ctx.verdicts.get(c.id);
      const auth = ctx.authenticity.get(c.id);
      if (v?.decision === 'block') lines.push(`${c.mpn}: not qualified on this platform`);
      else if (auth && !auth.ok) lines.push(`${c.mpn}: qualified part number, counterfeit units`);
      else if (c.leadTimeWeeks > 4) lines.push(`${c.mpn}: qualified, but ${c.leadTimeWeeks} weeks misses the build`);
    }
    const eligible = ctx.candidates
      .filter((c) => ctx.verdicts.get(c.id)?.decision === 'pass' && (ctx.authenticity.get(c.id)?.ok ?? true))
      .sort((a, b) => a.leadTimeWeeks - b.leadTimeWeeks || a.pricePerUnit - b.pricePerUnit);
    const win = eligible[0];

    return (
      (win
        ? `Recommendation: ${win.vendor} ${win.mpn} at ${money(win.pricePerUnit)} a module, ` +
          `${win.leadTimeWeeks} week(s) from ${win.source}. It is on the platform QVL, it is a ` +
          `drop-in module replacement with no die substitution and no board change, and it ` +
          `arrives inside the build window. `
        : `No candidate clears both qualification and authenticity inside the build window. `) +
      `Rejections: ${lines.join('; ')}. ` +
      `Plain version: one option is both tested in this server and genuinely available in time. ` +
      `The cheap one was never tested, and the fast cheap one was fake. Hand it to a human to approve.`
    );
  }
}
