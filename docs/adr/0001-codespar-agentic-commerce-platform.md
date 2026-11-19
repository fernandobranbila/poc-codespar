# 0001 - Adopt CodeSpar as Agentic Commerce Platform with Transparent Fallbacks

## Status
Accepted

## Context
We need to demonstrate a proof-of-concept (POC) of Agentic Commerce to the CEO and CTO. The system must support two-sided money movement—inbound customer collections (**Collect**) and outbound supplier settlements (**Pay**) governed by **Agent Mandates** and an **Approval Queue**—with a focus on modern rails (e.g., Pix). 

## Decision
We adopt **CodeSpar** (`codespar.dev`) on its free sandbox tier for agent runtime orchestration and MCP rail integrations. To guarantee 100% availability during executive presentations without risking third-party API downtime or token expiry, the architecture includes a high-fidelity local sandbox fallback that mirrors the CodeSpar SDK and MCP interfaces. Whenever this local fallback is activated, the system must explicitly flag and display its fallback status across UI badges, receipts, and audit logs (`[SANDBOX_FALLBACK_SIMULATOR]`).

## Considered Options
1. **Custom Banking / Payment APIs**: High development overhead, lacks built-in agent runtime, mandates, and MCP servers.
2. **US-Centric Agentic Commerce Protocols (e.g., ACP/UCP only)**: Disconnected from LATAM instant rails (Pix, Boletos) and local fiscal compliance.
3. **CodeSpar (Accepted)**: Native MCP servers for LATAM rails, built-in verifiable mandates, free sandbox testing, and clear pay-per-settled-transaction economics.

## Consequences
- The POC demonstrates end-to-end money movement without infrastructure cost during evaluation.
- All executive demonstrations are deterministic and resilient to network disruptions.
- Every transaction log and verifiable receipt clearly identifies whether it ran against `[CODESPAR_LIVE_SANDBOX]` or `[SANDBOX_FALLBACK_SIMULATOR]`.
