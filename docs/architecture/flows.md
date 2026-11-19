# CodeSpar Architectural Flows & Mermaid Sequence Diagrams

This document specifies the technical sequence and state diagrams for the CodeSpar Agentic Commerce proof-of-concept.

---

## 1. End-to-End 5-Pillar Commerce Flow

```mermaid
flowchart TD
    subgraph Channel ["1. Channel Ingestion"]
        User["Customer / Buyer"] -->|"1. Natural Language Intent via Chat"| Agent["CodeSpar Autonomous Agent"]
    end

    subgraph Collect ["2. Inbound Collect (Pix)"]
        Agent -->|"2. Call MCP: create_pix_charge"| CollectMCP["CodeSpar Collect MCP"]
        CollectMCP -->|"3. Generate Dynamic Pix (QR + Copia e Cola)"| User
        User -->|"4. Settle Pix via Banking App"| CentralBank["BACEN Instant Rail"]
        CentralBank -->|"5. Webhook Notification"| CollectMCP
        CollectMCP -->|"6. Payment Reconciled"| Agent
    end

    subgraph Operations ["3 & 4. Operations (Fiscal & Logistics)"]
        Agent -->|"7. Call MCP: issue_nfe"| FiscalMCP["Fiscal MCP (SEFAZ)"]
        FiscalMCP -->|"8. Issue NF-e + XML + Access Key"| ERP["ERP Ledger (Omie/Bling)"]
        Agent -->|"9. Call MCP: generate_shipping_label"| LogisticsMCP["Logistics MCP (Melhor Envio)"]
        LogisticsMCP -->|"10. Label & Tracking Code"| Dispatch["Carrier Dispatch"]
    end

    subgraph Pay ["5. Governed Outbound Pay"]
        Agent -->|"11. Needs Wholesale Restock (Outbound Pay)"| MandateGuard["Mandate Spending Gate"]
        MandateGuard -->|"Amount <= Mandate Cap"| AutoPay["Autonomous Payout via Open Banking"]
        MandateGuard -->|"Amount > Mandate Cap"| ApproverQueue["Human Approval Queue (HITL)"]
        Approver["Finance Manager"] -->|"Authorize / Reject"| ApproverQueue
        ApproverQueue -->|"Approved"| AutoPay
    end

    subgraph Audit ["Trust & Verification"]
        AutoPay -->|"12. Append Hash-Chained Record"| AuditLedger["Tamper-Evident Audit Trail"]
        AuditLedger -->|"13. Cryptographically Signed Receipt"| Final["Executive Verifiable Receipt"]
    end
```

---

## 2. Inbound Collect & Fiscal Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (WhatsApp/Web)
    participant Agent as CodeSpar Agent
    participant Collect as CodeSpar Collect MCP
    participant Pix as Central Bank / Pix Rail
    participant Fiscal as Fiscal MCP (SEFAZ)
    participant Shipping as Logistics MCP

    Customer->>Agent: "Order 2x Developer Kits to São Paulo"
    Agent->>Agent: Parse catalog, inventory, and calculate total (R$ 85.00)
    Agent->>Collect: create_charge(amount=85.00, rail="pix", currency="BRL")
    Collect-->>Agent: { charge_id: "ch_981", qr_code: "000201...", copy_paste: "pix.codespar.dev/pay/ch_981" }
    Agent-->>Customer: Present Pix QR Code & Copy-Paste string
    Customer->>Pix: Scan QR code and pay via mobile banking
    Pix-->>Collect: Webhook: PAYMENT_SETTLED (tx_id: "e902b1f", amount: 85.00)
    Collect-->>Agent: Event: charge.settled(ch_981)
    
    rect rgb(25, 45, 65)
        Note over Agent,Fiscal: Operational Fulfillment Tail
        Agent->>Fiscal: issue_nfe(buyer="Customer", value=85.00, items=[...])
        Fiscal-->>Agent: { nfe_key: "35261189020001...", status: "AUTHORIZED" }
        Agent->>Shipping: create_shipment(destination="SP", weight=1.2)
        Shipping-->>Agent: { tracking_number: "BR982104921", label_url: "https://..." }
    end

    Agent-->>Customer: "Payment confirmed! NF-e issued and tracking code is BR982104921"
```

---

## 3. Outbound Governed Pay & Approval Queue Flow

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Autonomous Agent
    participant Policy as Agent Mandate Engine
    actor Manager as Finance Manager (HITL)
    participant Banking as Open Banking / Stark Bank MCP
    participant Audit as Hash-Chained Audit Trail

    Agent->>Agent: Trigger: Restock supplier inventory
    Agent->>Policy: evaluate_payment_mandate(vendor="Supplier Corp", amount=R$ 450.00)
    
    alt Amount <= Mandate Threshold (e.g., R$ 200.00)
        Policy-->>Agent: MANDATE_APPROVED (Autonomous execution authorized)
        Agent->>Banking: execute_pix_transfer(pix_key="supplier@cnpj.br", amount=R$ 85.00)
        Banking-->>Agent: { status: "SETTLED", end_to_end_id: "E1823901" }
        Agent->>Audit: record_transaction(provenance="AUTONOMOUS", tx_id="E1823901")
    else Amount > Mandate Threshold (e.g., R$ 450.00 > R$ 200.00)
        Policy-->>Agent: ESCALATE_TO_APPROVAL_QUEUE (Budget threshold exceeded)
        Policy->>Manager: Step-Up Notification: "Agent requested R$ 450.00 for Supplier Corp"
        Manager->>Policy: Review details & Click "APPROVE"
        Policy-->>Agent: HUMAN_APPROVED_WITH_SIGNATURE
        Agent->>Banking: execute_pix_transfer(pix_key="supplier@cnpj.br", amount=R$ 450.00)
        Banking-->>Agent: { status: "SETTLED", end_to_end_id: "E4902188" }
        Agent->>Audit: record_transaction(provenance="HUMAN_SIGN_OFF", tx_id="E4902188")
    end
```

---

## 4. x402 Agent-to-Agent (A2A) Micropayment Flow

```mermaid
sequenceDiagram
    autonumber
    participant BuyerAgent as Buyer Agent (CodeSpar)
    participant SellerAgent as Data / Compute Provider (MCP Server)
    participant Micropay as CodeSpar x402 Rail

    BuyerAgent->>SellerAgent: GET /api/v1/market-intelligence/b2b-quotes
    SellerAgent-->>BuyerAgent: HTTP 402 Payment Required<br/>{ cost: "R$ 0.15", rail: "pix_micropay", invoice: "inv_x402_1" }
    BuyerAgent->>BuyerAgent: Check agent micro-budget mandate (Max R$ 5.00/day)
    BuyerAgent->>Micropay: settle_x402_invoice(invoice="inv_x402_1", amount=0.15)
    Micropay-->>BuyerAgent: { payment_proof: "sig_7a8bc9..." }
    BuyerAgent->>SellerAgent: GET /api/v1/market-intelligence/b2b-quotes<br/>Header: X-Payment-Proof: sig_7a8bc9...
    SellerAgent-->>BuyerAgent: HTTP 200 OK: { quotes: [...] }
```

---

## 5. Dual-Mode Engine & Transparent Fallback Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as Presentation Simulator / CLI
    participant Router as Engine Router
    participant Live as CodeSpar Live Sandbox API
    participant Fallback as High-Fidelity Fallback Simulator
    participant Output as Verifiable Receipt & UI Badge

    App->>Router: execute_transaction(payload)
    Router->>Live: Healthcheck & Ping Sandbox Endpoint
    
    alt Live Endpoint Healthy & Authorized
        Live-->>Router: HTTP 200 OK
        Router->>Live: Process Collect / Pay tools
        Live-->>Router: Result Payload
        Router->>Output: Emit Receipt with Badge: [CODESPAR_LIVE_SANDBOX]
    else Network Offline / API Unreachable / Sandbox Token Missing
        Live-->>Router: Connection Failed / Timeout
        Router->>Fallback: Divert to Deterministic Local Sandbox
        Fallback-->>Router: Simulated Sandbox Result Payload
        rect rgb(65, 25, 25)
            Note over Router,Output: Explicit Transparency Enforced (ADR-0001)
            Router->>Output: Emit Receipt with Conspicuous Badge:<br/>⚠️ [SANDBOX_FALLBACK_SIMULATOR]
        end
    end
```

---

## 6. State Machine: Agent Mandate & Approval Queue

```mermaid
stateDiagram-v2
    [*] --> Draft: Order Generated
    Draft --> PolicyCheck: Evaluate Against Mandate

    state PolicyCheck {
        [*] --> CheckMerchant
        CheckMerchant --> CheckBudget: Whitelisted
        CheckMerchant --> Rejected: Blacklisted / Unknown Vendor
        CheckBudget --> AutoApproved: Amount <= Autonomous Limit
        CheckBudget --> QueuePending: Amount > Autonomous Limit
    }

    AutoApproved --> Dispatched: Execute Immediate Settlement
    QueuePending --> StepUpReview: Push Notification to Manager
    
    StepUpReview --> ApprovedByHuman: Manager Signs Off
    StepUpReview --> RejectedByHuman: Manager Rejects
    StepUpReview --> Expired: TTL Elapsed (e.g. 15m)

    ApprovedByHuman --> Dispatched: Execute Settlement
    RejectedByHuman --> Cancelled: Revert Order
    Expired --> Cancelled: Revert Order

    Dispatched --> Settled: Webhook Finality Confirmed
    Settled --> Audited: Append to Tamper-Evident Ledger
    Audited --> [*]
```
