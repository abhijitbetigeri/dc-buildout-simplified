# Submission copy — paste-ready

Every claim below is defensible. Nothing here overclaims a sponsor.

---

## Project name

**LINEDOWN**

## One-liner (≤ 100 chars)

> The sourcing desk that keeps the line running — and proves to an auditor why it bought what it bought.

## Short description (~50 words)

> A server ODM's qualified DDR5 memory just had its allocation cut 40%. A 480-node AI cluster ships
> in 11 days. LINEDOWN is an agent desk that sources a *qualified* alternate before the line stops,
> screens it for counterfeits, and commits the decision with the full agent session attached.

## Long description

> The AI boom broke the memory market. HBM capacity cannibalised conventional DRAM supply, and
> server DDR5 got scarce. LINEDOWN is how a manufacturer buys through it.
>
> Memory is **2.06% of node material cost and 100% of the stoppage** — a $214 stick blocks a
> $249,561 node. When an allocation cut lands, a room of agents opens: Sourcing finds candidate
> modules, Engineering checks them against the platform's qualified-vendor list, Quality screens
> broker offers for counterfeits, and a human approves the winner with one click.
>
> Two gates, deliberately independent. The cheapest candidate matches all five platform
> requirements field-for-field and is **still blocked** — electrically fine, cheapest by $209,203,
> never tested in that board. A second candidate passes qualification but fails authenticity: its
> chip markings match a known remarked-counterfeit pattern at 93%, returned by on-device retrieval
> in 0.20 ms.
>
> Then Entire commits the decision with the agent session attached, so six months later
> `entire why` prints the actual prompt behind the sourcing call. Git tells you what changed;
> Entire tells you why. For a function that answers to IATF 16949 traceability, that is the product.
>
> Outcome: **$2,487,600 protected** on a single sourcing decision.

## What we'd tell you even though it doesn't flatter us

> Our first end-to-end run **approved the counterfeit.** The module photo couldn't be found, so
> Quality never completed a screen, so nothing came back as a *finding* — and the broker lot, being
> cheapest and fastest, won. We fixed it by failing closed on non-franchised supply: the absence of
> a finding is not a clean result. A naive sourcing agent optimises for price and lead time and
> buys counterfeits. That's why there are two gates and why one fails closed.

## Stack — one precise line each

- **ZooWork** — the agent runtime. Five agent definitions (Intake, Sourcing, Engineering, Quality,
  Market) built on `@zoowork-ai/sdk` 0.10.2 against the Managed Agents API; the event stream is
  what the UI renders.
- **Moss** — on-device semantic retrieval. Cross-vendor part-number equivalence and chip-marking
  matching, sub-millisecond, with the query never leaving the laptop.
- **Tavily** — outside-world data: DDR5 spot pricing, distributor stock and lead times, allocation
  news.
- **BAND** — the multi-agent room, where parties across company lines collaborate on one decision.
- **Entire** — session-attached commits. The sourcing decision carries the agent session that made it.

## Honest scope notes

- Moss has **no image embedding** today, so the counterfeit check is text matching over chip
  top-markings, lot codes and date codes — six independent findings, each reproducible by plain
  string, regex and date comparison.
- BAND has **no veto primitive**; the blocking gate is implemented in our orchestrator and is
  architected around ZooWork's `custom_tools`.
- The demo runs from a validated event log. Audit replay of a sourcing decision is what IATF 16949
  traceability requires — it is a feature of the product, not a stand-in for one.

## Links

- Repo: https://github.com/abhijitbetigeri/dc-buildout-simplified
- Screenshots: `ui/shots/` — counterfeit catch, engineering block, approval gate, outcome

## Tags

`ai-agents` `commerce` `procurement` `supply-chain` `semiconductors` `provenance` `mcp`
