# Feature Spec: CodeSpar Agentic Commerce POC

## Overview
This specification details the end-to-end implementation of an **Agentic Commerce** system using CodeSpar infrastructure (`codespar.dev`) on the free sandbox tier, targeting demonstration to executive leadership (CEO & CTO).

The architecture delivers full two-sided commerce:
1. **Inbound Collect**: Customer specifies intent via conversational channel $\rightarrow$ Agent creates dynamic Pix charge $\rightarrow$ Reconciles instant payment finality via BACEN webhook.
2. **Operations**: Automatic emission of SEFAZ NF-e (electronic tax invoice) and Melhor Envio logistics dispatch tracking.
3. **Outbound Governed Pay**: Autonomous supplier restocking payouts bounded by **Agent Mandates**, with automatic escalation to the **Approval Queue** (Human-in-the-Loop) for amounts exceeding spending thresholds.
4. **x402 Protocol**: Programmatic agent-to-agent (A2A) micro-transactions for on-demand data services.
5. **Trust & Governance**: Tamper-evident hash-chained audit ledger emitting verifiable signed receipts with mandatory provenance labels (`[CODESPAR_LIVE_SANDBOX]` vs. `[SANDBOX_FALLBACK_SIMULATOR]`) per [ADR-0001](file:///home/fernando/orca/poc-codespar/docs/adr/0001-codespar-agentic-commerce-platform.md).
6. **LATAM Expansion**: Decoupled MCP architecture enabling rapid expansion to Chile (`mcp-flow-cl`) and Mexico (STP SPEI) per [ADR-0002](file:///home/fernando/orca/poc-codespar/docs/adr/0002-brazil-first-latam-expansion.md).

## HTTP API & Real External Invocation
All capabilities must be testable outside of any mock UI or browser application via standard HTTP REST calls and copy-pasteable `curl` commands documented in [docs/api/http-curls.md](file:///home/fernando/orca/poc-codespar/docs/api/http-curls.md).
