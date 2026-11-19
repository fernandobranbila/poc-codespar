# 05: Executive Interactive Presentation & Live Simulator Deck

**What to build:** An interactive, single-file presentation dashboard (`presentation.html`) tailored for the CEO & CTO. The interface presents the business case (market opportunity, LATAM Pix economics, free tier validation), system architecture with natively rendered Mermaid diagrams, and a live simulator with persona switcher, mandate threshold slider, step-up Approval Queue modal, and verifiable receipt inspector.

**Blocked by:** 02: Automated Fiscal Compliance (SEFAZ NF-e) & Logistics Pipeline, 03: Governed Outbound Pay with Verifiable Agent Mandates & Approval Queue, 04: x402 Agent-to-Agent (A2A) Micropayment Protocol Provider.

**Status:** ready-for-agent

- [ ] Standalone zero-dependency HTML file runnable directly in any modern browser without npm build step.
- [ ] Dedicated CEO strategy section and CTO architecture section.
- [ ] Responsive Mermaid.js sequence and flowchart renderings.
- [ ] Live interactive simulator demonstrating autonomous settlement, approval queue escalation, and receipt verification.
- [ ] Displays conspicuous badge and alert for `[SANDBOX_FALLBACK_SIMULATOR]` vs. `[CODESPAR_LIVE_SANDBOX]` per ADR-0001.
