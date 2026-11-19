# CodeSpar Agentic Commerce POC

This proof-of-concept demonstrates **end-to-end agentic commerce on LATAM payment rails** using [CodeSpar](https://codespar.dev). Autonomous AI agents collect Pix payments, issue Brazilian tax invoices (NF-e), arrange shipments, pay suppliers with governance controls, and transact agent-to-agent via the x402 micropayment protocol — all without a human in the checkout loop. The POC runs in a **dual-mode engine**: with a live `CODESPAR_API_KEY` it hits real sandbox APIs; without one it falls back to a high-fidelity local simulator (see [ADR-0001](docs/adr/0001-codespar-agentic-commerce-platform.md)), so demos are always deterministic.

---

## Capabilities

| # | Capability | What it proves |
|---|-----------|---------------|
| 1 | **Collect (Pix)** | Agent generates a dynamic Pix charge and reconciles settlement |
| 2 | **Fiscal (NF-e)** | Automatic Brazilian tax invoice issued on payment confirmation |
| 3 | **Logistics** | Shipping quote + label dispatch via domestic carriers |
| 4 | **Governed Pay + Approval Queue** | Outbound supplier payment under Agent Mandate; escalates to human sign-off above spend cap |
| 5 | **x402 Micropayments** | HTTP 402 agent-to-agent data purchase — autonomous pay-per-request |

---

## Quick Start

```bash
npm install && npm start
# Server listens on http://localhost:3000
```

Open **[presentation.html](presentation.html)** in your browser for the full live-demo walkthrough.

---

## Documentation

| Resource | Description |
|----------|-------------|
| [docs/architecture/overview.md](docs/architecture/overview.md) | Architecture & executive overview (CEO + CTO sections) |
| [docs/api/http-curls.md](docs/api/http-curls.md) | Ready-to-run curl commands for every endpoint |
| [presentation.html](presentation.html) | Self-contained browser demo |

---

## Environment

| Variable | Effect |
|----------|--------|
| `CODESPAR_API_KEY` | (optional) If set, calls CodeSpar live sandbox. If absent, fallback engine activates automatically per ADR-0001. |
| `PORT` | HTTP port (default `3000`) |
