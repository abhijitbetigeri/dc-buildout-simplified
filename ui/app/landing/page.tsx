import type { Metadata } from "next";
import shotCounterfeit from "@/shots/1-counterfeit.png";
import shotBlock from "@/shots/2-block.png";
import shotApproval from "@/shots/3-approval.png";
import shotOutcome from "@/shots/4-outcome.png";
import {
  Beat,
  Card,
  Chip,
  Eyebrow,
  Figure,
  Heading,
  Lede,
  Mono,
  Section,
  Shot,
  StackRow,
} from "@/components/landing/parts";

export const metadata: Metadata = {
  title: "LINEDOWN — The sourcing desk that keeps the line running",
  description:
    "The AI boom broke the memory market. LINEDOWN is an agent desk that sources a qualified alternate before the line stops — and proves to an auditor why it chose what it chose.",
};

const REPO = "https://github.com/abhijitbetigeri/dc-buildout-simplified";

/**
 * LINEDOWN landing page — the showcase surface for the AI Commerce Gallery.
 *
 * Separate route by design: the war room at `/` is frozen and rehearsed. This
 * page imports nothing from it and writes nothing to the shared theme.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Hero />
      <OneStat />
      <HowItWorks />
      <TwoGates />
      <CaughtUs />
      <Stack />
      <Boundaries />
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- top bar */

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-base/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
          />
          <span className="mono truncate text-[0.875rem] font-semibold uppercase tracking-[0.26em] text-ink">
            Linedown
          </span>
        </div>
        <a
          href="/"
          className="mono shrink-0 rounded-sm border border-accent/50 bg-accent/[0.08] px-3 py-[7px] text-[0.6875rem] uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/[0.16]"
        >
          Live demo →
        </a>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="min-w-0">
            <Eyebrow tone="accent">AI Commerce Gallery · the buy side</Eyebrow>

            <h1 className="mono mt-6 text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.03em] text-ink sm:text-[4.5rem] lg:text-[5.25rem]">
              LINEDOWN
            </h1>

            <p className="mt-5 max-w-[26ch] text-[1.375rem] font-semibold leading-[1.2] tracking-[-0.015em] text-ink sm:max-w-[30ch] sm:text-[1.875rem]">
              The sourcing desk that keeps the line running.
            </p>

            <div className="mt-8 max-w-[62ch] border-l-2 border-line-bright/60 pl-4 sm:pl-5">
              <p className="text-[1.0625rem] leading-[1.65] text-dim sm:text-[1.125rem]">
                The AI boom broke the memory market. HBM capacity cannibalised conventional DRAM
                supply, and server DDR5 got scarce. A server ODM&rsquo;s qualified DDR5 RDIMM just
                had its allocation cut <Mono>40%</Mono> — <Mono>4,608</Mono> modules short, so{" "}
                <Mono>192</Mono> of <Mono>480</Mono> nodes cannot be built, <Mono>11</Mono> days
                before the kits are due on the factory floor.
              </p>
              <p className="mt-4 text-[1.0625rem] leading-[1.65] text-dim sm:text-[1.125rem]">
                LINEDOWN is a desk of agents that finds a replacement part that is{" "}
                <em className="not-italic text-ink">allowed</em> on this specific server, proves the
                seller isn&rsquo;t shipping fakes, gets one human to approve it, and writes down
                permanently why that choice was made.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
              <a
                href="/"
                className="mono inline-flex items-center gap-2.5 rounded-sm border border-accent bg-accent px-5 py-3 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[#1A1206] transition-opacity hover:opacity-90"
              >
                Watch the live demo
                <span aria-hidden>→</span>
              </a>
              <p className="mono text-[0.75rem] leading-[1.5] tracking-[0.08em] text-faint">
                2 min 23 s · press Space to start
              </p>
            </div>
          </div>

          <AtRiskPanel />
        </div>

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 sm:mt-16 sm:grid-cols-4">
          <Figure value="$2,487,600" label="Exposure protected" tone="approve" />
          <Figure value="2.5" unit="min" label="Decision time" />
          <Figure value="$209,203" label="Savings Engineering refused" tone="block" />
          <Figure value="1" label="Human clicks required" tone="accent" />
        </div>
      </div>
    </section>
  );
}

/**
 * The at-risk parts-list line, rendered as the desk renders it. It gives the
 * fold an instrument to look at rather than empty space, and it front-loads the
 * one fact the whole page turns on: this is a single line of a bill of
 * materials.
 */
function AtRiskPanel() {
  return (
    <aside className="lg:pt-10">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="mono text-[0.625rem] uppercase tracking-[0.2em] text-block">
            ● Allocation alert
          </span>
          <span className="mono text-[0.625rem] uppercase tracking-[0.16em] text-faint">
            BOM-0020
          </span>
        </div>

        <div className="px-5 py-5">
          <p className="mono break-all text-[1.0625rem] font-semibold leading-tight text-ink">
            MTC20F2085S1RC48BA1
          </p>
          <p className="mono mt-2 text-[0.75rem] leading-[1.5] tracking-[0.04em] text-faint">
            64GB DDR5-4800 RDIMM (2Rx4)
          </p>

          <div className="mt-5 space-y-2.5 border-t border-line pt-4">
            <StatLine k="Program" v="AI-SRV-G4" />
            <StatLine k="Nodes" v="480" />
            <StatLine k="Qty at risk" v="4,608" />
            <StatLine k="Kits due in" v="11 days" />
            <StatLine k="Burn rate" v="$1,240 / min" />
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <p className="mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
            Four candidates, resolved
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="block">1 blocked</Chip>
            <Chip tone="block">1 counterfeit</Chip>
            <Chip>1 too slow</Chip>
            <Chip tone="approve">1 approved</Chip>
          </div>
        </div>
      </Card>
    </aside>
  );
}

/* ------------------------------------------------------- the problem, 1 stat */

function OneStat() {
  return (
    <Section className="bg-surface/60">
      <Eyebrow>The problem, in one stat</Eyebrow>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div>
          <p className="mono text-[3rem] font-semibold leading-[0.95] tracking-[-0.03em] text-accent sm:text-[4.25rem]">
            2.06%
          </p>
          <p className="mt-3 text-[1.25rem] font-semibold leading-[1.3] text-ink sm:text-[1.5rem]">
            of what a node costs in materials.
          </p>

          <p className="mono mt-10 text-[3rem] font-semibold leading-[0.95] tracking-[-0.03em] text-block sm:text-[4.25rem]">
            100%
          </p>
          <p className="mt-3 text-[1.25rem] font-semibold leading-[1.3] text-ink sm:text-[1.5rem]">
            of what stops the line.
          </p>
        </div>

        <div className="flex flex-col justify-end">
          <Card className="p-6 sm:p-7">
            <p className="text-[1.125rem] leading-[1.5] text-ink sm:text-[1.3125rem]">
              A <Mono>$214</Mono> memory stick blocks a <Mono>$249,561</Mono> server.
            </p>
            <div className="mt-6 space-y-3 border-t border-line pt-5">
              <StatLine k="Material cost per node" v="$249,561" />
              <StatLine k="Memory share of that" v="2.06%" />
              <StatLine k="Sticks per node" v="24" />
              <StatLine k="Sticks for the program" v="11,520" />
              <StatLine k="Line-down burn rate" v="$1,240 / min" />
              <StatLine k="One day of program slip" v="$1,785,600" />
            </div>
            <p className="mt-6 text-[0.875rem] leading-[1.6] text-faint">
              Derived, not asserted — the arithmetic is a 20-line bill of materials for a 480-node
              cluster, <Mono>$119.8M</Mono> of material. Nobody staffs a team to save 2% of material
              cost. Everybody staffs a team to stop the line going down. That asymmetry is the
              entire business case for this desk.
            </p>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function StatLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="mono text-[0.6875rem] uppercase tracking-[0.16em] text-faint">{k}</span>
      <span className="mono tnum text-[0.9375rem] text-ink">{v}</span>
    </div>
  );
}

/* ------------------------------------------------------------- how it works */

function HowItWorks() {
  return (
    <Section>
      <Eyebrow>How it works</Eyebrow>
      <Heading>Seven beats, two and a half minutes, one human click.</Heading>
      <Lede>
        Five agents — Sourcing, Market, Engineering, Quality and the human desk — work a single
        broken parts-list line from the allocation notice to a committed decision record.
      </Lede>

      {/* The counterfeit catch is the hero image. It leads. */}
      <div className="mt-12">
        <Shot
          src={shotCounterfeit}
          alt="The LINEDOWN war room showing a counterfeit detection: the broker's module label beside the verified manufacturer reference, a 93% remark-pattern match, and six independent marking discrepancies."
          caption={
            <>
              <Chip tone="block">Beat 5</Chip>
              <span className="min-w-0">
                The broker&rsquo;s sticks match a known remarked pattern at 93% and the part they
                claim to be at 41%. Six independent marking failures on lot PRC-24817.
              </span>
            </>
          }
          priority
          tone="block"
        />
      </div>

      <ol className="mt-14 grid gap-9 sm:grid-cols-2 lg:gap-x-14">
        <Beat n="1" title="The allocation cut opens a war room">
          The supplier ships 40% less than ordered. 4,608 modules short, Build-1 kits due in 11
          days. A counter starts accruing idle-line and late-delivery exposure at $1,240 a minute.
        </Beat>
        <Beat n="2" title="Market looks outside the company">
          Tavily pulls spot pricing, distributor stock and lead times — and an industry advisory
          about counterfeit memory moving cheap through brokers. That advisory is why beat 5 happens
          at all.
        </Beat>
        <Beat n="3" title="Moss finds cross-vendor equivalents">
          Moss decodes the part number and returns every module that is the same part from a
          different brand — four equivalents, on-device, in about a quarter of a millisecond. The
          query never leaves the laptop, so the desk can run this on every line of the parts list,
          not just the one that broke.
        </Beat>
        <Beat n="4" title="Engineering blocks the cheapest option" tone="block">
          It checks the QVL — the list of parts that have actually been tested in this exact server,
          not parts that fit on paper. Three of four are listed. The cheapest is not. The gate that holds a
          run here is ZooWork&rsquo;s <Mono>custom_tools</Mono>, verified live against the API.
          Engineering gives up $209,203 and puts its name on it.
        </Beat>
        <Beat n="5" title="Quality catches a counterfeit lot" tone="block">
          A broker has 4,608 of the exact allocated part, in stock today, 29% under our own contract
          price. Nobody can get that part. Moss matches the printing on the chips against reference
          lots: 93% to a known remarked pattern, 41% to the genuine article. Rejected.
        </Beat>
        <Beat n="6" title="A human approves — once" tone="approve">
          The run pauses. One person approves the qualified alternate: tested on this server, in
          authorised distributor stock, five working days out. PO-4471982, $1,068,134.40. This is
          the only decision the agents don&rsquo;t make.
        </Beat>
        <Beat n="7" title="Entire commits the decision record" tone="accent">
          The QVL change lands as a real commit whose message is the decision: which part was
          qualified, which was blocked and why, which broker lot was blacklisted. Six months later
          an auditor asking why we paid a premium gets an exact answer.
        </Beat>
        <Beat n="→" title="$2,487,600 protected" tone="approve">
          One avoided day of program slip ($1,785,600) plus the counterfeit scrap and rebuild we did
          not buy ($702,000). The email version of this decision takes days, and the factory is idle
          for every one of them.
        </Beat>
      </ol>

      <div className="mt-16 grid gap-10 lg:gap-14">
        <Shot
          src={shotBlock}
          alt="The QVL lookup table: three part numbers qualified, the cheapest marked NOT LISTED, and a full-width red BLOCKED card with Engineering's reasoning."
          caption={
            <>
              <Chip tone="block">Beat 4</Chip>
              <span className="min-w-0">
                Spec-compatible on all five platform requirements — and still blocked. The
                qualification report was never finished.
              </span>
            </>
          }
          tone="block"
        />
        <Shot
          src={shotApproval}
          alt="The approval gate: the run paused, waiting for a human to approve the qualified alternate."
          caption={
            <>
              <Chip tone="approve">Beat 6</Chip>
              <span className="min-w-0">
                The run halts here and will not advance until a person approves it.
              </span>
            </>
          }
          tone="approve"
        />
        <Shot
          src={shotOutcome}
          alt="The closing state: $2,487,600 of exposure protected, a 2.5 minute decision time, the drafted purchase order and the committed decision record."
          caption={
            <>
              <Chip tone="approve">Close</Chip>
              <span className="min-w-0">
                Four candidates, two rejects, one block, one PO. The line stays up.
              </span>
            </>
          }
          tone="approve"
        />
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- two gates */

function TwoGates() {
  return (
    <Section className="bg-surface/60">
      <Eyebrow>The two gates</Eyebrow>
      <Heading>Allowed and authentic are different questions.</Heading>
      <Lede>
        A shopping agent picks the cheapest listing that matches the spec. A buyer cannot. Two
        independent checks stand between a quote and a purchase order, and a candidate has to clear
        both — passing one says nothing about the other.
      </Lede>

      <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card tone="block" className="flex flex-col p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="block">Gate 1</Chip>
            <span className="mono text-[0.8125rem] uppercase tracking-[0.14em] text-dim">
              Qualification
            </span>
          </div>
          <h3 className="mt-5 text-[1.1875rem] font-semibold leading-snug text-ink">
            Has this part actually been tested in this board?
          </h3>
          <p className="mt-4 text-[0.9375rem] leading-[1.65] text-dim">
            The QVL is a record of what was tested, not of what fits. The cheapest candidate —{" "}
            <Mono>TRA564G48D4360</Mono>, $45 a stick under the approved part — matched all five
            platform requirements exactly. 64GB, 4800 MT/s, 2Rx4, RDIMM, 1.1V. Electrically perfect
            on paper.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-[1.65] text-dim">
            It was blocked anyway: its evaluation has been open since July with no RDIMM margin
            report, no thermal validation, no 24-slot loading data, and it is not covered by the
            shipped BIOS memory reference code. Nobody has ever run 24 of them in one machine at
            full load.
          </p>
          <p className="mt-5 border-l-2 border-block/50 pl-3 text-[0.9375rem] leading-[1.6] text-[#FFC9C7]">
            $209,203 on one parts-list line, refused. The block is not a model being cautious — it
            is a function of the data. Put that part on the qualified list and the same code clears
            it.
          </p>
        </Card>

        <Card tone="block" className="flex flex-col p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="block">Gate 2</Chip>
            <span className="mono text-[0.8125rem] uppercase tracking-[0.14em] text-dim">
              Authenticity
            </span>
          </div>
          <h3 className="mt-5 text-[1.1875rem] font-semibold leading-snug text-ink">
            Is this seller shipping the part they say they are?
          </h3>
          <p className="mt-4 text-[0.9375rem] leading-[1.65] text-dim">
            The broker&rsquo;s offer was the <em className="not-italic text-ink">incumbent</em> part
            number — <Mono>MTC20F2085S1RC48BA1</Mono>, already qualified on this platform, report
            MV-G4-0244. Gate 1 had nothing to say about it. Qualification covers the part, not this
            seller&rsquo;s lot.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-[1.65] text-dim">
            Gate 2 read the markings instead: FBGA code <Mono>D8BQK</Mono> on a SKU that ships
            D8BNJ, a date code inconsistent with the board revision it is printed on, abrasion and
            ink overprint where the manufacturer laser-etches. Six independent failures. One is
            enough.
          </p>
          <p className="mt-5 border-l-2 border-block/50 pl-3 text-[0.9375rem] leading-[1.6] text-[#FFC9C7]">
            A part can be qualified and counterfeit. A part can be genuine and unqualified. Either
            one scraps the build, so neither check can stand in for the other.
          </p>
        </Card>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------- it caught us buying it */

function CaughtUs() {
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <Eyebrow tone="block">What went wrong</Eyebrow>
          <h2 className="mt-5 text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.5rem]">
            &ldquo;It caught us buying the fake.&rdquo;
          </h2>
          <p className="mt-6 text-[1.0625rem] leading-[1.6] text-dim">
            The honest question to ask a sourcing agent is whether it just rubber-stamps whatever is
            cheapest. We know the answer, because ours did.
          </p>
        </div>

        <Card tone="block" className="p-6 sm:p-8">
          <p className="text-[1.0625rem] leading-[1.65] text-ink sm:text-[1.125rem]">
            Our first end-to-end run <strong className="font-semibold text-block">approved the
            counterfeit.</strong>
          </p>
          <p className="mt-5 text-[0.9375rem] leading-[1.7] text-dim">
            The module photograph could not be found, so Quality never completed an authenticity
            screen. Because nothing came back as a <em className="not-italic text-ink">finding</em>,
            the lot passed. It was the cheapest and the fastest, so it won. The system recommended
            buying the fake.
          </p>
          <p className="mt-5 text-[0.9375rem] leading-[1.7] text-dim">
            The fix was making the gate <strong className="font-semibold text-ink">fail closed on
            non-franchised supply</strong>: unscreened grey-market stock is not purchasable, full
            stop. The absence of a finding is not a clean result.
          </p>
          <p className="mt-5 border-l-2 border-block/50 pl-4 text-[0.9375rem] leading-[1.7] text-[#FFC9C7]">
            That is not a patch for a demo — it is correct procurement posture. No certificate of
            conformance, no traceability, no serial the manufacturer can look up is the{" "}
            <em className="not-italic">normal</em> state of a counterfeit lot, not an anomaly.
            Franchised distribution is treated differently on purpose, because there the paperwork is
            itself the authenticity evidence.
          </p>
          <p className="mt-6 border-t border-block/30 pt-5 text-[0.9375rem] leading-[1.7] text-dim">
            A naive sourcing agent optimises for price and lead time and buys counterfeits. That is
            exactly why there are two independent gates, and why one of them fails closed.
          </p>
        </Card>
      </div>

      <RefusedToGuess />
    </Section>
  );
}

/**
 * The other direction. A gate that only ever says yes is not a gate — and the
 * first live round trip against ZooWork proved this one also declines to decide
 * when it cannot look the answer up.
 */
function RefusedToGuess() {
  return (
    <Card tone="accent" className="mt-10 p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <Eyebrow tone="accent">And in the other direction</Eyebrow>
          <h3 className="mt-5 text-[1.25rem] font-semibold leading-snug text-ink sm:text-[1.5rem]">
            It refused to guess when it couldn&rsquo;t look the part up.
          </h3>
          <p className="mt-5 text-[0.9375rem] leading-[1.7] text-dim">
            We ran the Engineering gate end to end against the live ZooWork API. The agent called{" "}
            <Mono>qvl_lookup</Mono>, the run halted, and we deliberately withheld the answer. The
            platform held it in <Mono>awaiting_approval</Mono> with one pending custom tool call —
            it did not time-slice past us and it did not invent a verdict.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-[1.7] text-dim">
            On the first attempt we withheld it past the tool budget and the call timed out. The
            agent did not fall back on the spec sheet, which matched perfectly. It stopped:
          </p>
          <blockquote className="mt-5 border-l-2 border-accent/50 pl-4 text-[0.9375rem] leading-[1.65] text-[#F3D7B4]">
            &ldquo;I called the authoritative QVL lookup twice… it timed out both times. I
            can&rsquo;t qualify or reject it until the QVL service responds.&rdquo;
          </blockquote>
          <p className="mt-6 border-t border-accent/20 pt-5 text-[0.9375rem] leading-[1.7] text-dim">
            One failure approved what it had not screened. The other declined to decide what it
            could not look up. Together they are why we trust the gate: it is load-bearing in both
            directions.
          </p>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-md border border-line bg-base">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
                agents / verify-zoowork.ts
              </span>
              <Chip tone="approve">Verified</Chip>
            </div>
            <pre className="scroll-dark overflow-x-auto px-4 py-4 text-[0.6875rem] leading-[1.8] text-dim sm:text-[0.75rem]">
              <code className="mono">
                {`REQUESTED  tool=qvl_lookup
  callId=ctc_01M41ZFXZ7TVAS1YXZTFATSAY2

t+1.9s  run_status=awaiting_approval
        pending_custom_tool_calls=1
t+4.6s  run_status=awaiting_approval
        pending_custom_tool_calls=1
t+7.3s  run_status=awaiting_approval
        pending_custom_tool_calls=1

resolveCustomToolCall() -> resumed
verdict=block  cand-01  not-listed`}
              </code>
            </pre>
          </div>
          <p className="mt-3 text-[0.8125rem] leading-[1.6] text-faint">
            The run genuinely paused. On <Mono>resolveCustomToolCall</Mono> it resumed and blocked
            cand-01 using our computed verdict from the real <Mono>data/qvl.json</Mono>. The gate is
            live and tested; the seven-beat run above is the replay log.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- stack */

function Stack() {
  return (
    <Section className="bg-surface/60">
      <Eyebrow>Stack</Eyebrow>
      <Heading>Five components, one job each.</Heading>
      <Lede>
        Each sentence below is written to survive a follow-up question. Where we checked a claim and
        could not support it, the limit is printed next to the claim rather than left out.
      </Lede>

      <div className="mt-10 border-b border-line">
        <StackRow
          name="ZooWork"
          role="Runtime · gate"
          caveat={
            <>
              The boundary worth stating plainly: the gate is live and tested; the run you watched
              is the replay log. Reproducible — <Mono>cd agents &amp;&amp; npx tsx
              verify-zoowork.ts</Mono>, with the transcript committed at{" "}
              <Mono>data/cache/zoowork-roundtrip.json</Mono>.
            </>
          }
        >
          The runtime the desk is built on and the mechanism the Engineering block is designed
          around: <Mono>custom_tools</Mono> halts a run until the application calls{" "}
          <Mono>resolveCustomToolCall</Mono>, which is why the gate can be enforced by the platform
          rather than by prompt convention — and it is why the module photo would reach a vision
          model as a base64 image block in a tool result, since ZooWork has no attachment API for
          session input. <strong className="font-semibold text-ink">We ran that halt end to end
          against the live API</strong>, with a real agent on <Mono>litellm/gpt-5.6-terra</Mono>{" "}
          selected from <Mono>listModels()</Mono>.
        </StackRow>

        <StackRow
          name="Moss"
          role="Retrieval · on-device"
          caveat={
            <>
              Moss has no image embedding, so beat 5 is text matching over markings, not a
              comparison of pixels. The confidentiality claim is that the query never leaves the
              laptop — index creation is a cloud operation, so &ldquo;no photos leave the
              building&rdquo; would be an overclaim and we do not make it.
            </>
          }
        >
          On-device retrieval over two text indexes: decoded module specifications, which is how
          cross-vendor part equivalence is found, and module top-marking strings, which is how the
          counterfeit lot is caught. Measured at about a quarter of a millisecond per query against
          a loaded local index.
        </StackRow>

        <StackRow name="Tavily" role="Outside the company">
          The only component that looks outside the company: spot pricing, lead times, distributor
          stock, and the industry counterfeit advisory that makes Quality suspicious in the first
          place.
        </StackRow>

        <StackRow
          name="BAND"
          role="The room"
          caveat={
            <>
              BAND has no native veto or block primitive — its event vocabulary is five strings and
              nothing halts a room — so the gate in beat 4 is ZooWork&rsquo;s, not BAND&rsquo;s. We
              put the veto where it could be enforced in code instead of socially.
            </>
          }
        >
          The cross-company room the agents talk in: Sourcing, Market, Engineering and Quality
          arguing about the same parts-list line across organisational lines.
        </StackRow>

        <StackRow
          name="Entire"
          role="Provenance"
          caveat={
            <>
              <Mono>entire why</Mono> is the command, and it is designed to print the originating
              prompt when a checkpoint is linked. No checkpoint is linked to our commits, so what we
              can show is the committed decision record, not the prompt behind it. The hosted share
              URL is unverified and we do not click it.
            </>
          }
        >
          The provenance layer over the qualified-parts list: the git hook is installed and{" "}
          <Mono>entire why</Mono> resolves any line of the committed QVL to the commit, author and
          decision that produced it, so the parts list carries its own reasoning rather than leaving
          it in somebody&rsquo;s inbox.
        </StackRow>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- boundaries */

function Boundaries() {
  return (
    <Section>
      <Eyebrow>What is real, and what isn&rsquo;t</Eyebrow>
      <Heading className="max-w-[24ch]">We would rather tell you than have you find it.</Heading>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Note k="The seven-beat run is a replay">
          And replay is a shipped feature, not a cop-out: reconstructing how a part was selected is
          exactly what IATF 16949 traceability requires. The UI consumes a list of events and
          genuinely cannot tell live from recorded — same code path, same event shapes.
        </Note>
        <Note k="The prices are illustrative">
          Plausible and internally consistent, derived from the bill of materials — not quoted
          market data. The part numbers are real market part numbers for 64GB 2Rx4 DDR5-4800 RDIMMs;
          the broker lot code is format-correct and invented.
        </Note>
        <Note k="The search results are placeholders">
          The Tavily integration is real and the call signature is verified. What renders in the
          demo is the recorded shape of that output, not retrieved citations.
        </Note>
        <Note k="Moss did not compare the photographs">
          It matched the marking text — FBGA code, lot code, date code — against reference and
          known-bad lots. The images on screen are the evidence a human looks at. Remarking shows up
          in the codes before it shows up to the eye.
        </Note>
        <Note k="The gate ran live">
          The <Mono>custom_tools</Mono> halt is verified end to end against the live ZooWork API —
          real agent, real session, the run held in <Mono>awaiting_approval</Mono> until we
          resolved it. The gate is live and tested; the run you watched is the replay log.
        </Note>
        <Note k="The gate itself is testable">
          <Mono>checkQvl</Mono> is a pure function of (candidate, QVL). One of 25 passing tests
          takes this exact blocked candidate, adds it to the QVL, and shows the verdict flip from
          block to pass. Same code, same input, different data, different answer.
        </Note>
      </div>
    </Section>
  );
}

function Note({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <p className="mono text-[0.6875rem] uppercase leading-[1.5] tracking-[0.16em] text-accent">
        {k}
      </p>
      <p className="mt-3 text-[0.875rem] leading-[1.65] text-dim">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ footer */

function Footer() {
  return (
    <footer className="border-t border-line/70 bg-surface/60">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-8 sm:py-16">
        <p className="text-[1.375rem] font-semibold leading-[1.25] tracking-[-0.015em] text-ink sm:text-[1.75rem]">
          Two percent of the bill of materials is a hundred percent of the line.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-4">
          <a
            href="/"
            className="mono inline-flex items-center gap-2.5 rounded-sm border border-accent bg-accent px-5 py-3 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[#1A1206] transition-opacity hover:opacity-90"
          >
            Watch the live demo
            <span aria-hidden>→</span>
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="mono inline-flex items-center gap-2.5 rounded-sm border border-line-bright px-5 py-3 text-[0.8125rem] uppercase tracking-[0.14em] text-dim transition-colors hover:border-ink hover:text-ink"
          >
            Source on GitHub
            <span aria-hidden>↗</span>
          </a>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-7 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="mono text-[0.75rem] uppercase tracking-[0.18em] text-faint">
            Linedown · AI Commerce Gallery · 3 Oct 2026
          </p>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="mono break-all text-[0.75rem] tracking-[0.04em] text-faint underline decoration-line-bright underline-offset-4 transition-colors hover:text-dim"
          >
            github.com/abhijitbetigeri/dc-buildout-simplified
          </a>
        </div>
      </div>
    </footer>
  );
}
