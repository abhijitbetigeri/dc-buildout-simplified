/**
 * Tavily adapter — search + extract for DDR5 RDIMM market intelligence.
 *
 * Cache-first by design, and not as an afterthought. `data/cache/tavily-*.json` is consulted
 * before the network on every call, so the demo has an answer whether or not a key exists and
 * whether or not the venue wifi holds up. `captureAll()` refreshes the cache from the live API;
 * run it once, early, while there is still time to notice a problem.
 *
 * Cut-ladder position: live Tavily is item 2 on the cut ladder. This module is built so that
 * cutting it is a no-op — you simply do not run the capture, and the cached JSON answers.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TavilySources } from '../types.js';

const API = 'https://api.tavily.com';

export type Topic = 'pricing' | 'stock' | 'news';

export interface TavilyQuery {
  topic: Topic;
  query: string;
  label: string;
}

/** The three things the desk actually needs to know. */
export const QUERIES: Record<Topic, TavilyQuery> = {
  pricing: {
    topic: 'pricing',
    query: 'DDR5 RDIMM 64GB 4800 spot price per module server memory contract price trend',
    label: 'Pulling DDR5 RDIMM spot pricing',
  },
  stock: {
    topic: 'stock',
    query: 'DDR5 RDIMM 64GB distributor stock availability lead time weeks server memory',
    label: 'Checking distributor stock and lead times',
  },
  news: {
    topic: 'news',
    query: 'DDR5 server memory allocation cut supplier HBM capacity shift datacenter DRAM shortage',
    label: 'Scanning allocation and supply news',
  },
};

interface RawResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
}

function cachePath(repoRoot: string, topic: Topic): string {
  return resolve(repoRoot, `data/cache/tavily-${topic}.json`);
}

export interface CachedTavily extends TavilySources {
  /** true when this file was hand-written as a fixture rather than captured from the API. */
  _fixture?: boolean;
  _capturedAt?: string;
  _query?: string;
}

/**
 * Live search. Returns schema-shaped `tavily.sources`.
 * Throws on any failure — callers use `search()` which falls back to cache.
 */
async function searchLive(q: TavilyQuery, apiKey: string): Promise<TavilySources> {
  const res = await fetch(`${API}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: q.query,
      search_depth: 'advanced',
      max_results: 4,
      include_answer: false,
      // commodity pricing goes stale fast; a year-old price page is worse than no page
      topic: q.topic === 'news' ? 'news' : 'general',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`tavily ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { results?: RawResult[] };
  const sources = (json.results ?? []).slice(0, 4).map((r) => ({
    title: (r.title ?? 'Untitled source').slice(0, 160),
    url: r.url ?? '',
    snippet: (r.content ?? r.raw_content ?? '').replace(/\s+/g, ' ').trim().slice(0, 320),
  }));
  if (!sources.length) throw new Error('tavily returned zero results');
  return { sources };
}

async function readCache(repoRoot: string, topic: Topic): Promise<CachedTavily | null> {
  try {
    return JSON.parse(await readFile(cachePath(repoRoot, topic), 'utf8')) as CachedTavily;
  } catch {
    return null;
  }
}

export interface SearchOutcome {
  sources: TavilySources['sources'];
  /** where the answer came from — surfaced in status output, never hidden */
  provenance: 'live' | 'cache' | 'fixture';
  note?: string;
}

/**
 * Cache-first search. Order: cache (unless `preferLive`) → live → fixture.
 * Never throws; the demo must not die on a search.
 */
export async function search(
  repoRoot: string,
  topic: Topic,
  opts: { preferLive?: boolean } = {},
): Promise<SearchOutcome> {
  const q = QUERIES[topic];
  const apiKey = process.env.TAVILY_API_KEY;

  if (!opts.preferLive) {
    const cached = await readCache(repoRoot, topic);
    if (cached?.sources?.length) {
      return {
        sources: cached.sources,
        provenance: cached._fixture ? 'fixture' : 'cache',
        note: cached._capturedAt ? `captured ${cached._capturedAt}` : 'hand-written fixture',
      };
    }
  }

  if (apiKey) {
    try {
      const live = await searchLive(q, apiKey);
      return { sources: live.sources, provenance: 'live' };
    } catch (err) {
      const cached = await readCache(repoRoot, topic);
      if (cached?.sources?.length) {
        return {
          sources: cached.sources,
          provenance: cached._fixture ? 'fixture' : 'cache',
          note: `live call failed (${(err as Error).message}), served from cache`,
        };
      }
      return { sources: FIXTURES[topic].sources, provenance: 'fixture', note: `live failed: ${(err as Error).message}` };
    }
  }

  const cached = await readCache(repoRoot, topic);
  if (cached?.sources?.length) {
    return { sources: cached.sources, provenance: cached._fixture ? 'fixture' : 'cache' };
  }
  return { sources: FIXTURES[topic].sources, provenance: 'fixture', note: 'TAVILY_API_KEY unset' };
}

/**
 * Capture every topic to data/cache/. Run EARLY.
 * Returns a per-topic report so a partial failure is visible rather than silent.
 */
export async function captureAll(repoRoot: string): Promise<Record<Topic, string>> {
  const apiKey = process.env.TAVILY_API_KEY;
  const report = {} as Record<Topic, string>;
  await mkdir(resolve(repoRoot, 'data/cache'), { recursive: true });

  for (const topic of Object.keys(QUERIES) as Topic[]) {
    const q = QUERIES[topic];
    if (!apiKey) {
      // Seed the fixture so the cache directory is never empty, and mark it honestly.
      const existing = await readCache(repoRoot, topic);
      if (existing && !existing._fixture) {
        report[topic] = 'kept existing real capture (no key to refresh)';
        continue;
      }
      const payload: CachedTavily = { ...FIXTURES[topic], _fixture: true, _query: q.query };
      await writeFile(cachePath(repoRoot, topic), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      report[topic] = 'FIXTURE written (TAVILY_API_KEY unset — re-run capture once a key exists)';
      continue;
    }
    try {
      const live = await searchLive(q, apiKey);
      const payload: CachedTavily = {
        ...live,
        _fixture: false,
        _capturedAt: new Date().toISOString(),
        _query: q.query,
      };
      await writeFile(cachePath(repoRoot, topic), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      report[topic] = `captured ${live.sources.length} live sources`;
    } catch (err) {
      const payload: CachedTavily = { ...FIXTURES[topic], _fixture: true, _query: q.query };
      await writeFile(cachePath(repoRoot, topic), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      report[topic] = `LIVE FAILED (${(err as Error).message}) — fixture written instead`;
    }
  }
  return report;
}

/**
 * Last-resort fixtures.
 *
 * These are PLACEHOLDERS, deliberately pointing at publication roots rather than invented
 * article paths — a fabricated deep link that 404s in front of a judge is worse than an
 * obviously generic one. The market context they describe (HBM capacity cannibalising
 * conventional DRAM supply, DDR5 server contract prices climbing, suppliers putting
 * customers on allocation) is the real backdrop of the scenario. Replace with a live
 * capture the moment TAVILY_API_KEY exists: `npm run capture`.
 */
export const FIXTURES: Record<Topic, TavilySources> = {
  pricing: {
    sources: [
      {
        title: 'DDR5 RDIMM server module contract pricing — quarterly trend',
        url: 'https://www.trendforce.com/',
        snippet:
          'Server DRAM contract prices continued to climb quarter over quarter as suppliers ' +
          'reallocated wafer capacity toward HBM. 64GB DDR5-4800 RDIMM modules saw the steepest ' +
          'move in the conventional server segment, with spot quotes running well above contract.',
      },
      {
        title: 'Spot market quotes, 64GB DDR5-4800 RDIMM',
        url: 'https://www.dramexchange.com/',
        snippet:
          'Spot offers for 64GB DDR5-4800 registered modules widened against contract pricing, ' +
          'with broker inventory commanding a premium. Buyers report quote validity windows ' +
          'shortening to days.',
      },
      {
        title: 'Memory market outlook — conventional DRAM under HBM squeeze',
        url: 'https://www.counterpointresearch.com/',
        snippet:
          'Every wafer moved to HBM removes several times its area of conventional DDR5 supply. ' +
          'Analysts expect server DDR5 tightness to persist while HBM qualification ramps absorb ' +
          'leading-edge capacity.',
      },
    ],
  },
  stock: {
    sources: [
      {
        title: 'Distributor stock and quoted lead times — DDR5 RDIMM',
        url: 'https://www.digikey.com/',
        snippet:
          'Authorised distribution shows limited on-hand quantity for 64GB DDR5-4800 RDIMM with ' +
          'factory lead times quoted in multiples of weeks. Backorder positions are being accepted ' +
          'without firm delivery commitment.',
      },
      {
        title: 'Server memory availability and allocation status',
        url: 'https://www.mouser.com/',
        snippet:
          'Several registered DDR5 server module lines show no stock with scheduled factory ' +
          'deliveries. Where stock exists it is in quantities below typical cluster build volumes.',
      },
    ],
  },
  news: {
    sources: [
      {
        title: 'Memory suppliers place server DRAM customers on allocation',
        url: 'https://www.reuters.com/technology/',
        snippet:
          'Suppliers have notified server and ODM customers of reduced allocation on conventional ' +
          'DDR5 server memory as capacity shifts toward high-bandwidth memory for AI accelerators. ' +
          'Affected buyers are being asked to requalify alternate module sources.',
      },
      {
        title: 'HBM capacity expansion pressures conventional DRAM output',
        url: 'https://www.tomshardware.com/',
        snippet:
          'HBM production consumes substantially more wafer area per bit than conventional DRAM, ' +
          'so the AI-driven HBM ramp directly reduces available DDR5 bit supply. Server builders ' +
          'report allocation cuts and extended lead times.',
      },
      {
        title: 'Counterfeit and remarked server memory resurfaces in shortage conditions',
        url: 'https://ercimarketplace.com/',
        snippet:
          'Shortage conditions historically correlate with a rise in remarked and counterfeit ' +
          'memory modules entering the independent distribution channel. Buyers are advised to ' +
          'verify top markings and lot codes against manufacturer references before acceptance.',
      },
    ],
  },
};
