# LINEDOWN

**The sourcing desk that keeps the line running.**

Built at the AI Commerce Gallery hackathon — Walt Disney Family Museum, 3 Oct 2026.

---

A server ODM's qualified DDR5 RDIMM just had its allocation cut 40%. A 480-node AI cluster
ships in 11 days. LINEDOWN is the agent desk that sources a *qualified* alternate before the
line stops — and proves to an auditor why it chose what it chose.

The AI boom broke the memory market. HBM capacity cannibalised conventional DRAM supply, and
server DDR5 got scarce. This is how a manufacturer buys through it.

## What it does

1. An allocation cut opens a war room. A money counter starts burning.
2. **Tavily** pulls live spot pricing, distributor stock and allocation news.
3. **Moss** decodes the part number and finds cross-vendor equivalents on spec — on-device, sub-10ms.
4. **Engineering blocks** the cheapest option: not on the platform QVL.
5. A broker offer looks too good. Photograph the module's chip markings → **Moss** matches a
   remarked/counterfeit pattern → rejected.
6. A qualified alternate is approved by a human, with one click. PO drafted.
7. **Entire** commits the QVL change with the full agent session attached. `entire blame`
   answers the auditor six months later.

## Stack

| Sponsor | Role |
|---|---|
| **ZooWork** | Hosts every agent. Agent → Session → Events; the event stream is what the UI renders. |
| **Moss** | On-device multimodal search: part-number equivalence and chip-marking matching. |
| **Tavily** | Spot pricing, distributor stock, lead times, allocation news. |
| **BAND** | The room — agents across company lines, with a Critic that can block. |
| **Entire** | Session-attached commits. Git tells you what changed; Entire tells you why. |

## Run it

```bash
cp .env.example .env    # fill in keys
cd ui && npm install && npm run dev
```

The UI consumes an event list conforming to [`docs/EVENT-SCHEMA.md`](docs/EVENT-SCHEMA.md).
Live mode and replay mode are indistinguishable to it — replay is a real feature, since audit
replay of a sourcing decision is what IATF 16949 traceability requires.

- Plan and status: [`MILESTONES.md`](MILESTONES.md)
- Per-track progress: [`status/`](status/)
