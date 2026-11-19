# 04: x402 Agent-to-Agent (A2A) Micropayment Protocol Provider

**What to build:** An HTTP 402 Payment Required integration that allows an autonomous agent to discover and purchase external computational or market data services per-request using Pix/x402 micropayments. When an agent queries an upstream paywalled endpoint, it receives an HTTP 402 challenge, evaluates its internal micro-budget mandate (e.g., max R$ 5.00/day), settles the invoice programmatically, and retries the request with a cryptographic payment proof header (`X-Payment-Proof`).

**Blocked by:** 03: Governed Outbound Pay with Verifiable Agent Mandates & Approval Queue.

**Status:** ready-for-agent

- [ ] Upstream API returns `HTTP 402 Payment Required` with `X-Invoice-Id`, `X-Cost-Brl`, and settlement instructions.
- [ ] `POST /api/v1/x402/settle` accepts the micro-invoice, checks the agent micro-budget mandate, and issues a cryptographic payment proof token.
- [ ] Retrying original resource with `X-Payment-Proof` header unblocks payload with `HTTP 200 OK`.
- [ ] Verifiable via standard HTTP curl commands without browser interface.
