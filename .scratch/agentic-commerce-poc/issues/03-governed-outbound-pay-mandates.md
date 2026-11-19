# 03: Governed Outbound Pay with Verifiable Agent Mandates & Approval Queue

**What to build:** An outbound procurement payout system where an autonomous agent can settle wholesale restock bills with suppliers, strictly bounded by an Agent Mandate. Outbound requests under the mandate spending cap (e.g., R$ 200.00) settle autonomously via Open Banking rails. Requests exceeding the cap or targeting non-whitelisted vendors are halted and placed in an Approval Queue for human sign-off via HTTP API.

**Blocked by:** 01: Core Inbound Collect & Dynamic Pix Rail Integration.

**Status:** ready-for-agent

- [ ] `POST /api/v1/pay/pix-transfer` evaluates payment against active Agent Mandate policy (spending cap, vendor whitelist, expiration).
- [ ] Requests below threshold return `MANDATE_APPROVED` and execute payout immediately.
- [ ] Requests exceeding threshold return `ESCALATED_TO_APPROVAL_QUEUE` and generate a pending authorization record.
- [ ] `POST /api/v1/governance/approval-queue/{id}/sign-off` allows a human manager to approve or reject the transaction with digital signature.
- [ ] Tamper-evident receipt is emitted upon payout completion with verifiable hash and provenance tag.
