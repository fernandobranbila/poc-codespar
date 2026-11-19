# CodeSpar Agentic Commerce — CEO Brief

**Date:** November 2026 | **Status:** POC Complete — Go/No-Go Decision Requested

---

## The Problem

E-commerce was designed for humans. Every transaction today requires a person to browse, select, enter payment details, and manually authorize. As AI agents increasingly act on behalf of users and businesses — buying inventory, paying suppliers, accessing data APIs — this human-gated model becomes the bottleneck. **Agents cannot transact autonomously on existing commerce infrastructure.**

---

## The Opportunity

Brazil has built the world's most advanced instant payment infrastructure:

- **Pix** processes **4+ billion transactions per month** with **sub-3-second finality** and **near-zero cost** — operated by Brazil's Central Bank (BACEN).
- **NF-e fiscal compliance** (tax invoicing) is federally mandated at the moment of every sale.
- Brazil's payment penetration and regulatory maturity outpaces the US and EU for real-time settlement.

Global agentic commerce protocols — Stripe ACP, Google UCP — are designed for US credit card rails: 2.5–3.5% interchange, multi-day settlement, high fraud rates. **They ignore LATAM entirely.**

This creates a first-mover opening: a production-ready agentic commerce stack natively wired to LATAM rails, before any global player gets there.

---

## What We Are Proving

This POC demonstrates that **CodeSpar enables complete end-to-end agentic commerce on LATAM infrastructure** — no human in the loop:

1. **Collect (Pix)** — Agent generates a Pix charge and reconciles settlement in real time.
2. **Fiscal (NF-e)** — Brazilian tax invoice issued automatically upon payment confirmation.
3. **Logistics** — Shipping quote and label dispatched programmatically via domestic carriers.
4. **Governed Pay + Approval Queue** — Outbound supplier payments under strict Agent Mandate policies; transactions above the spend cap escalate to human sign-off rather than fail.
5. **x402 Micropayments** — Agent-to-agent API access purchases via the HTTP 402 protocol; pay-per-request with no human intervention.

The POC runs with **zero infrastructure cost**: CodeSpar's free-tier sandbox provides full API coverage, test keys, and hosted MCP servers. Demos are deterministic via an on-device fallback engine (no external dependency required).

---

## Economics

| Stage | Collect Fee | Pay Fee |
|-------|-------------|---------|
| **Sandbox (now)** | Free | Free |
| **Production** | 1% (capped R$ 2.00) | 10 bps (capped R$ 2.00) |

For context: a R$ 500 sale incurs R$ 2.00 collect fee (0.4% effective rate) — dramatically below card interchange. A R$ 5,000 supplier payout incurs R$ 2.00 pay fee (0.04% effective rate).

---

## Why Now

- **Global agentic protocols are US-centric.** No incumbent is building for LATAM rails.
- **Pix adoption is at inflection.** 4B+ monthly transactions in 2024; growth still accelerating. Merchants and developers are actively seeking programmatic Pix tooling.
- **Regulatory window is open.** LGPD and BACEN Open Finance frameworks are settled; production integration is permissible today.
- **CodeSpar's sandbox is free.** The validation cost is engineering time only — no vendor commitment until we choose to go live.

---

## The Ask — Go / No-Go

This POC validates technical feasibility across all 5 capability pillars with a working codebase, deterministic test suite, and zero infrastructure spend.

**Decision requested:**

> **GO** → Allocate an engineering team (suggested: 2–3 engineers) to production integration. Estimated timeline to first live Pix transaction: 6–8 weeks.
>
> **NO-GO** → Archive the POC. No sunk cost beyond engineering hours already spent.

There is no partial option: the value is in owning the LATAM agentic commerce position before a well-funded global competitor does.

---

*Technical detail: [docs/architecture/overview.md](../architecture/overview.md) | Curl-tested API reference: [docs/api/http-curls.md](../api/http-curls.md)*
