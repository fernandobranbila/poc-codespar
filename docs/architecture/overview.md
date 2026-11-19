# CodeSpar Agentic Commerce POC: Architecture & Executive Overview

## 1. Executive Summary (For the CEO)

### The Strategic Shift: From E-Commerce to Agentic Commerce
Traditional e-commerce requires humans to browse catalogues, compare prices, fill forms, and manually authorize checkouts. **Agentic Commerce** shifts the paradigm: autonomous and semi-autonomous AI agents act as buyers and sellers, discovering products, negotiating terms, verifying compliance, executing payments, and reconciling ledgers with minimal human friction.

```
Traditional E-Commerce:  Human Browses → Human Selects → Human Enters Card → Human Waits
Agentic Commerce:        Human Intent  → Agent Discovers → Agent Decides → Governed Pay → Instant Settlement
```

### Why Latin America & Why Pix?
Global agentic protocols (such as Stripe ACP or Google UCP) rely heavily on US/European credit card rails characterized by 2.5–3.5% interchange fees, multi-day settlement delays, and high chargeback fraud. 

Latin America—spearheaded by Brazil—presents the world's most mature instant payment infrastructure:
* **Pix** processes over 4 billion monthly transactions with sub-3-second finality and near-zero cost.
* **Fiscal automation (NF-e)** is mandatory by federal law (SEFAZ), requiring immediate tax invoice validation at the moment of sale.
* **CodeSpar** (`codespar.dev`) is built natively for this reality: it provides an open-source multi-agent runtime and Model Context Protocol (MCP) toolchain that connects AI agents directly to regional payment, fiscal, and logistics rails.

### Economic Model & Free Tier Posture
* **Zero Infrastructure Cost for Exploration**: CodeSpar provides free sandbox testing, free test keys, and free hosted/open-source MCP servers.
* **Production Pricing Follows Settled Money**:
  * **Collect (Money In)**: 1% transaction fee (capped at R$ 2.00, no floor).
  * **Pay (Outbound Supplier Payouts)**: 10 bps (0.10%) with a R$ 0.05 floor and R$ 2.00 cap.
* **Risk Containment**: Agents do not have unbounded credit access. All spending is strictly bounded by **Agent Mandates**.

---

## 2. Technical Architecture & Governance (For the CTO)

### The 5 Pillars of CodeSpar Architecture
CodeSpar orchestrates the complete operational lifecycle of modern commerce through 5 modular pillars:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CODESPAR AGENTIC OPERATING SYSTEM                      │
└─────────────────────────────────────────────────────────────────────────────┘
       │                    │                   │                     │
       ▼                    ▼                   ▼                     ▼
┌──────────────┐     ┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│  1. CHANNELS │     │  2. PAYMENTS │    │  3. FISCAL   │     │ 4. LOGISTICS │
│  WhatsApp    │     │  Collect Pix │    │  SEFAZ NF-e  │     │ Melhor Envio │
│  Slack / Web │     │  Governed Pay│    │  Focus /     │     │ Skydropx     │
│  Telegram    │     │  x402 Paywall│    │  NuvemFiscal │     │ Tracking     │
└──────────────┘     └──────────────┘    └──────────────┘     └──────────────┘
       │                    │                   │                     │
       └────────────────────┼───────────────────┴─────────────────────┘
                            ▼
              ┌───────────────────────────┐
              │ 5. GOVERNANCE & SECURITY  │
              │ • Agent Spend Mandates    │
              │ • Approval Queue (HITL)   │
              │ • Hash-Chained Audit Trail│
              │ • ERP Sync (Omie / Bling) │
              └───────────────────────────┘
```

1. **Channels**: Channel-agnostic agent runtime deploying agents into WhatsApp, Slack, Telegram, Discord, and Web consoles.
2. **Payments & Banking (Collect & Pay)**:
   - **Collect**: Real-time generation of dynamic Pix QR codes, Copia e Cola strings, and instant webhook listeners.
   - **Pay**: Outbound supplier payments via Open Banking APIs (Celcoin, Stark Bank, Itaú).
   - **x402 Micropayments**: HTTP 402 protocol integration enabling agent-to-agent (A2A) data/API service purchases.
3. **Fiscal Automation (NF-e)**: Instant electronic tax invoice generation with SEFAZ access keys upon payment reconciliation.
4. **Logistics**: Instant shipping quotes, label dispatch, and real-time tracking generation via domestic carriers.
5. **Governance & Audit**:
   - **Agent Mandates**: Cryptographically bound budget limits, merchant whitelists, and expiration timers.
   - **Approval Queue (Human-in-the-Loop)**: Automatic escalation when transactions exceed spending caps.
   - **Audit Trail**: Tamper-evident, hash-chained ledger logging every prompt, tool call, payment ID, and signed receipt.

---

## 3. High Availability Strategy & Transparent Fallback

To guarantee that executive demonstrations and critical operations never suffer from external API timeouts, network flakiness, or expired sandbox tokens, the architecture incorporates a **Dual-Mode Execution Engine**:

```
                       [Incoming Commerce Request]
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │    CodeSpar Client Hub    │
                      └───────────────────────────┘
                                    │
                         Is Live Sandbox Reached?
                                    │
                       ┌────────────┴────────────┐
                  YES  │                         │  NO / OFFLINE
                       ▼                         ▼
         ┌─────────────────────────┐ ┌─────────────────────────┐
         │  CODESPAR LIVE SANDBOX  │ │    FALLBACK ENGINE      │
         │  Real MCP Tools & Rails │ │ High-Fidelity Simulator │
         │  Status: [LIVE_SANDBOX] │ │ Status: [FALLBACK_ACTIVE│
         └─────────────────────────┘ └─────────────────────────┘
                       │                         │
                       └────────────┬────────────┘
                                    ▼
                      ┌───────────────────────────┐
                      │  Verifiable Signed Receipt│
                      │  + Audit Log with Engine  │
                      │    Provenance Badge       │
                      └───────────────────────────┘
```

> [!IMPORTANT]
> **Mandatory Provenance Requirement**: In compliance with [ADR-0001](file:///home/fernando/orca/poc-codespar/docs/adr/0001-codespar-agentic-commerce-platform.md), whenever the fallback engine is utilized, every user interface badge, console log, and verifiable receipt is explicitly flagged with `[SANDBOX_FALLBACK_SIMULATOR]` to preserve complete audit honesty.

---

## 4. Multi-Country LATAM Expansion Roadmap

In accordance with [ADR-0002](file:///home/fernando/orca/poc-codespar/docs/adr/0002-brazil-first-latam-expansion.md), the initial demonstration executes on **Brazil (Pix + NF-e)**. However, CodeSpar's decoupled MCP design enables rapid regional expansion:

| Country | Payment Rails (Inbound/Outbound) | Fiscal / Invoicing | CodeSpar MCP Package | Expansion Phase |
| :--- | :--- | :--- | :--- | :--- |
| 🇧🇷 **Brazil** *(Current POC)* | **Pix**, Boletos, Celcoin/Stark Bank | SEFAZ NF-e / NFS-e | `mcp-asaas`, `mcp-celcoin`, `mcp-nuvemfiscal` | **Phase 1 (Live Demo)** |
| 🇨🇱 **Chile** | **Flow.cl** (Webpay, ETpay, Multicaja) | SII DTE (Boleta Electrónica) | `mcp-flow-cl` (HMAC-SHA256 signed) | **Phase 2 (Q1)** |
| 🇲🇽 **Mexico** | **SPEI** via STP, CoDi | SAT CFDI 4.0 | `mcp-stp-mexico`, `mcp-facturama` | **Phase 3 (Q2)** |
| 🇨🇴 **Colombia** | **PSE**, Wompi | DIAN Factura Electrónica | `mcp-wompi-colombia` | **Phase 4 (Q3)** |
