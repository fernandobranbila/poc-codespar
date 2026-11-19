# CodeSpar Agentic Commerce: Complete HTTP & cURL Reference

This document provides ready-to-run, copy-pasteable `curl` commands for every step of the 5-pillar commerce loop. These endpoints work outside of any browser demo or mock interface, supporting both live CodeSpar sandbox environments and the local fallback engine.

---

## Environment Setup & Variables

Set your target server and optional sandbox API key before running the curls:

```bash
# Target base URL (default local runner: http://localhost:3000)
export CODESPAR_BASE_URL="http://localhost:3000"

# Optional: CodeSpar Hosted Sandbox Test Key (leave blank to run against local fallback)
export CODESPAR_API_KEY="csp_test_sandbox_9812401824"
```

---

## 1. Inbound Collect: Dynamic Pix Generation

Creates a dynamic Pix charge with an EMV QR code string and instant Copia e Cola payload.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/collect/pix" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}" \
  -d '{
    "amount_brl": 85.00,
    "buyer": {
      "name": "Acme Client LTDA",
      "email": "purchasing@acme.com",
      "tax_id": "12.345.678/0001-90"
    },
    "order_reference": "ORD-2026-9810",
    "description": "2x Developer Starter Kits"
  }'
```

### Expected Response (`201 Created`):
```json
{
  "charge_id": "ch_1795052901",
  "amount_brl": 85.00,
  "currency": "BRL",
  "pix_copy_paste": "00020126580014br.gov.bcb.pix0136ch_1795052901520400005303986540585.005802BR5916CodeSpar Commerce6009SAO PAULO62070503***6304E8A2",
  "status": "AWAITING_PAYMENT",
  "engine_provenance": "[SANDBOX_FALLBACK_SIMULATOR]",
  "created_at": "2026-11-19T01:35:00.000Z"
}
```

---

## 2. BACEN Instant Payment Webhook (Settlement)

Simulates the instant settlement webhook from the Central Bank / Pix provider confirming payment receipt.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/webhooks/pix-settled" \
  -H "Content-Type: application/json" \
  -H "X-CodeSpar-Signature: sha256=9f82ab7c0192e847..." \
  -d '{
    "event": "charge.settled",
    "charge_id": "ch_1795052901",
    "end_to_end_id": "E18239019284019284019284",
    "amount_settled_brl": 85.00,
    "settled_at": "2026-11-19T01:35:05.000Z"
  }'
```

---

## 3. Query Inbound Charge Status

Inspects the real-time settlement status of any charge.

```bash
curl -X GET "${CODESPAR_BASE_URL}/api/v1/collect/charges/ch_1795052901" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}"
```

---

## 4. Automated Fiscal Compliance: Issue SEFAZ NF-e

Calls CodeSpar's Fiscal MCP tool to issue an official electronic tax invoice validated with a 44-digit access key.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/fiscal/nfe/issue" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}" \
  -d '{
    "charge_id": "ch_1795052901",
    "buyer_name": "Acme Client LTDA",
    "buyer_cnpj": "12.345.678/0001-90",
    "items": [
      { "description": "Developer Starter Kit", "quantity": 2, "unit_price_brl": 42.50 }
    ],
    "total_brl": 85.00
  }'
```

### Expected Response (`200 OK`):
```json
{
  "nfe_key": "352611890200019284015500100006343081829018291",
  "protocol_number": "PR-1795052910",
  "status": "AUTHORIZED",
  "danfe_xml_url": "https://sandbox.codespar.dev/fiscal/danfe/35261189020001...",
  "issued_at": "2026-11-19T01:35:06.000Z"
}
```

---

## 5. Logistics: Generate Shipping Label & Tracking (Melhor Envio)

Calculates freight dispatch and generates a carrier shipping tracking code.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/logistics/shipment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}" \
  -d '{
    "order_id": "ORD-2026-9810",
    "destination_postal_code": "01310-100",
    "destination_city": "São Paulo - SP",
    "package": { "weight_kg": 1.2, "dimensions_cm": { "h": 10, "w": 20, "l": 25 } }
  }'
```

### Expected Response (`200 OK`):
```json
{
  "shipment_id": "shp_81920",
  "carrier": "Melhor Envio",
  "tracking_code": "BR51764718-SP",
  "status": "LABEL_GENERATED",
  "label_pdf_url": "https://sandbox.codespar.dev/labels/BR51764718-SP.pdf"
}
```

---

## 6. Governed Outbound Pay: Autonomous Supplier Settlement

Executes outbound supplier restock payout. When the requested amount is **within the Agent Mandate limit** (e.g., R$ 85.00 $\le$ R$ 200.00), it settles autonomously.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/pay/pix-transfer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}" \
  -d '{
    "supplier_name": "Supplier Corp Brazil",
    "pix_key": "finance@suppliercorp.com.br",
    "amount_brl": 85.00,
    "description": "Wholesale restock for ORD-2026-9810"
  }'
```

### Expected Response (`200 OK` - Autonomous Settlement):
```json
{
  "payout_id": "pay_1795052920",
  "supplier_name": "Supplier Corp Brazil",
  "amount_brl": 85.00,
  "mandate_mode": "AUTONOMOUS",
  "status": "SETTLED",
  "settled_at": "2026-11-19T01:35:08.000Z",
  "engine_provenance": "[SANDBOX_FALLBACK_SIMULATOR]"
}
```

---

## 7. Governed Outbound Pay: High-Ticket Step-Up Escalation

Requests an outbound payment that **exceeds the Agent Mandate limit** (e.g., R$ 450.00 &gt; R$ 200.00), triggering an immediate escalation to the Approval Queue.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/pay/pix-transfer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}" \
  -d '{
    "supplier_name": "Supplier Corp Brazil",
    "pix_key": "finance@suppliercorp.com.br",
    "amount_brl": 450.00,
    "description": "Enterprise Hardware Restock Cluster"
  }'
```

### Expected Response (`202 Accepted` - Approval Queue Escalation):
```json
{
  "queue_id": "queue_req_49012",
  "status": "ESCALATED_TO_APPROVAL_QUEUE",
  "amount_brl": 450.00,
  "autonomous_limit_brl": 200.00,
  "reason": "Requested amount exceeds autonomous spending limit",
  "action_required": "Human manager sign-off via Approval Queue API"
}
```

---

## 8. Human Approval Queue Sign-Off

Authorizes and releases the held transaction using a human manager's cryptographic signature.

```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/governance/approval-queue/queue_req_49012/sign-off" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CODESPAR_API_KEY}" \
  -d '{
    "action": "APPROVE",
    "manager_email": "finance.director@company.com",
    "manager_signature": "sig_mgr_ed25519_8f0a29...",
    "notes": "Approved for Q4 enterprise deployment"
  }'
```

### Expected Response (`200 OK` - Released & Settled):
```json
{
  "payout_id": "pay_1795052930",
  "supplier_name": "Supplier Corp Brazil",
  "amount_brl": 450.00,
  "mandate_mode": "HUMAN_APPROVAL_QUEUE",
  "status": "SETTLED",
  "settled_at": "2026-11-19T01:35:15.000Z",
  "approver_notes": "Cryptographically signed by Finance Manager"
}
```

---

## 9. x402 Agent-to-Agent (A2A) Micropayments

### Step 9A: Trigger HTTP 402 Payment Required
Query an upstream data provider requiring micro-payment:

```bash
curl -i -X GET "${CODESPAR_BASE_URL}/api/v1/a2a/market-quotes?sku=DEV-KIT"
```

#### Response (`HTTP/1.1 402 Payment Required`):
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Invoice-Id: inv_x402_9812
X-Cost-Brl: 0.15
X-Rail: pix_micropay

{
  "error": "Payment Required",
  "cost_brl": 0.15,
  "invoice_id": "inv_x402_9812",
  "settlement_endpoint": "/api/v1/x402/settle"
}
```

### Step 9B: Settle Micro-Invoice via CodeSpar Rail
```bash
curl -X POST "${CODESPAR_BASE_URL}/api/v1/x402/settle" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "inv_x402_9812",
    "amount_brl": 0.15
  }'
```

#### Response:
```json
{
  "status": "PAID",
  "payment_proof": "proof_tok_9f82bc1084a"
}
```

### Step 9C: Unblock Resource with Payment Proof
```bash
curl -X GET "${CODESPAR_BASE_URL}/api/v1/a2a/market-quotes?sku=DEV-KIT" \
  -H "X-Payment-Proof: proof_tok_9f82bc1084a"
```

#### Response (`200 OK`):
```json
{
  "sku": "DEV-KIT",
  "lowest_wholesale_brl": 41.20,
  "available_stock": 1400,
  "supplier": "TechDistributor SA"
}
```

---

## 10. Audit: Verify Tamper-Evident Receipt

Fetches and verifies the complete hash-chained audit record for any transaction.

```bash
curl -X GET "${CODESPAR_BASE_URL}/api/v1/audit/receipts/latest"
```

### Expected Response:
```json
{
  "receipt_id": "rcpt_1795052940",
  "timestamp": "2026-11-19T01:35:16.000Z",
  "engine_provenance": "[SANDBOX_FALLBACK_SIMULATOR]",
  "compliance_adr": "ADR-0001",
  "inbound_collect": {
    "charge_id": "ch_1795052901",
    "amount_brl": 85.00,
    "fee_brl": 0.85,
    "nfe_key": "352611890200019284015500100006343081829018291",
    "tracking_code": "BR51764718-SP"
  },
  "governed_outbound_pay": {
    "status": "SETTLED",
    "mandate_mode": "AUTONOMOUS",
    "amount_brl": 85.00
  },
  "hash_chain_sha256": "6f3acc25eeb1c14b1d77a2cfed673df7cead8b3efbf01554ce89a93502250f9c"
}
```

---

## 11. Near Real-Time Persistence Inspection (ADR-0003)

Directly consult the underlying persistent state files (`data/store.json` and `data/audit-trail.jsonl`).

### 11A. Fetch Full Store State
```bash
curl -s -X GET "${CODESPAR_BASE_URL}/api/v1/data/store"
```

### 11B. Fetch Append-Only Audit Ledger (JSONL)
```bash
curl -s -X GET "${CODESPAR_BASE_URL}/api/v1/data/audit-trail"
```

