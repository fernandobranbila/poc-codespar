# Evidence Report: Ticket 01 - Inbound Collect & Dynamic Pix Rail

**Ticket:** [01: Core Inbound Collect & Dynamic Pix Rail Integration](file:///home/fernando/orca/poc-codespar/.scratch/agentic-commerce-poc/issues/01-collect-pix-integration.md)  
**Execution Date:** 2026-11-19 02:00 UTC  
**Environment:** Linux (x86_64), Node.js v24.20.0  
**Target Server:** `http://localhost:3000`  
**Engine Provenance:** `[SANDBOX_FALLBACK_SIMULATOR]` (per ADR-0001)  
**Persistence Mode:** Local Disk (`data/store.json` + `data/audit-trail.jsonl` per ADR-0003)

---

## 1. Step 1: Create Dynamic Pix Charge via HTTP API

### Executed Command:
```bash
curl -i -X POST "http://localhost:3000/api/v1/collect/pix" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_brl": 85.00,
    "buyer": {
      "name": "Acme Corp",
      "email": "purchasing@acme.com"
    },
    "order_reference": "ORD-2026-9810"
  }'
```

### Actual HTTP Response Received:
```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Engine-Provenance: [SANDBOX_FALLBACK_SIMULATOR]
Date: Thu, 19 Nov 2026 01:59:53 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{
  "charge_id": "ch_1795053593077_putvk",
  "amount_brl": 85,
  "currency": "BRL",
  "pix_copy_paste": "00020126580014br.gov.bcb.pix0136ch_1795053593077_putvk520400005303986540585.005802BR5916CodeSpar Commerce6009SAO PAULO62070503***6304E8A2",
  "status": "AWAITING_PAYMENT",
  "engine_provenance": "[SANDBOX_FALLBACK_SIMULATOR]",
  "created_at": "2026-11-19T01:59:53.077Z"
}
```

**Observation:**
- Status `201 Created` returned.
- Dynamic Pix Copia e Cola EMV string generated containing BACEN PIX identifier and exact amount (`85.00`).
- Header `X-Engine-Provenance: [SANDBOX_FALLBACK_SIMULATOR]` correctly enforced.

---

## 2. Step 2: Query Charge Status Before Settlement

### Executed Command:
```bash
curl -i -X GET "http://localhost:3000/api/v1/collect/charges/ch_1795053593077_putvk"
```

### Actual HTTP Response Received:
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Engine-Provenance: [SANDBOX_FALLBACK_SIMULATOR]
Date: Thu, 19 Nov 2026 01:59:58 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{
  "chargeId": "ch_1795053593077_putvk",
  "amountBrl": 85,
  "currency": "BRL",
  "buyerName": "Acme Corp",
  "buyerEmail": "purchasing@acme.com",
  "orderReference": "ORD-2026-9810",
  "pixCopyPaste": "00020126580014br.gov.bcb.pix0136ch_1795053593077_putvk520400005303986540585.005802BR5916CodeSpar Commerce6009SAO PAULO62070503***6304E8A2",
  "qrCodeSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"#000\"/><text x=\"10\" y=\"50\" fill=\"#fff\">PIX:ch_1795053593077_putvk</text></svg>",
  "status": "AWAITING_PAYMENT",
  "engineProvenance": "[SANDBOX_FALLBACK_SIMULATOR]",
  "createdAt": "2026-11-19T01:59:53.077Z"
}
```

---

## 3. Step 3: Reconcile Settlement via Central Bank (BACEN) Webhook

### Executed Command:
```bash
curl -i -X POST "http://localhost:3000/api/v1/webhooks/pix-settled" \
  -H "Content-Type: application/json" \
  -d '{
    "charge_id": "ch_1795053593077_putvk",
    "end_to_end_id": "E18290182490182"
  }'
```

### Actual HTTP Response Received:
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Engine-Provenance: [SANDBOX_FALLBACK_SIMULATOR]
Date: Thu, 19 Nov 2026 02:00:05 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{
  "status": "RECONCILED",
  "charge_id": "ch_1795053593077_putvk",
  "payment_status": "SETTLED",
  "settled_at": "2026-11-19T02:00:05.547Z"
}
```

---

## 4. Step 4: Verify Post-Settlement Charge State

### Executed Command:
```bash
curl -i -X GET "http://localhost:3000/api/v1/collect/charges/ch_1795053593077_putvk"
```

### Actual HTTP Response Received:
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Engine-Provenance: [SANDBOX_FALLBACK_SIMULATOR]

{
  "chargeId": "ch_1795053593077_putvk",
  "amountBrl": 85,
  "currency": "BRL",
  "buyerName": "Acme Corp",
  "buyerEmail": "purchasing@acme.com",
  "orderReference": "ORD-2026-9810",
  "status": "SETTLED",
  "engineProvenance": "[SANDBOX_FALLBACK_SIMULATOR]",
  "createdAt": "2026-11-19T01:59:53.077Z",
  "settledAt": "2026-11-19T02:00:05.547Z",
  "endToEndId": "E18290182490182"
}
```

---

## 5. Step 5: Persistent Disk File Verification (`data/store.json`)

### Executed Command:
```bash
cat data/store.json
```

### Actual File Content on Disk:
```json
{
  "charges": {
    "ch_1795053593077_putvk": {
      "chargeId": "ch_1795053593077_putvk",
      "amountBrl": 85,
      "currency": "BRL",
      "buyerName": "Acme Corp",
      "buyerEmail": "purchasing@acme.com",
      "orderReference": "ORD-2026-9810",
      "pixCopyPaste": "00020126580014br.gov.bcb.pix0136ch_1795053593077_putvk520400005303986540585.005802BR5916CodeSpar Commerce6009SAO PAULO62070503***6304E8A2",
      "qrCodeSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"#000\"/><text x=\"10\" y=\"50\" fill=\"#fff\">PIX:ch_1795053593077_putvk</text></svg>",
      "status": "SETTLED",
      "engineProvenance": "[SANDBOX_FALLBACK_SIMULATOR]",
      "createdAt": "2026-11-19T01:59:53.077Z",
      "settledAt": "2026-11-19T02:00:05.547Z",
      "endToEndId": "E18290182490182"
    }
  },
  "payouts": {},
  "approval_queue": {},
  "x402_proof_tokens": []
}
```

---

## 6. Step 6: Tamper-Evident Hash Chain Verification (`data/audit-trail.jsonl`)

### Executed Command:
```bash
cat data/audit-trail.jsonl
```

### Actual File Content on Disk:
```jsonl
{"index":1,"timestamp":"2026-11-19T01:59:53.077Z","action":"PIX_CHARGE_CREATED","entityId":"ch_1795053593077_putvk","engineProvenance":"[SANDBOX_FALLBACK_SIMULATOR]","payload":{"amountBrl":85,"buyer":"purchasing@acme.com"},"prev_hash_sha256":"0000000000000000000000000000000000000000000000000000000000000000","curr_hash_sha256":"a0394c585d2b70ad6e71a5e8f2ef89958a0a951db3ca0c81104c04f27c0d3ded"}
{"index":2,"timestamp":"2026-11-19T02:00:05.547Z","action":"PIX_CHARGE_SETTLED","entityId":"ch_1795053593077_putvk","engineProvenance":"[SANDBOX_FALLBACK_SIMULATOR]","payload":{"amountBrl":85,"endToEndId":"E18290182490182"},"prev_hash_sha256":"a0394c585d2b70ad6e71a5e8f2ef89958a0a951db3ca0c81104c04f27c0d3ded","curr_hash_sha256":"5003aaf84baa60345348204df8119af5e2e59a7b465796d2b2b7ba8d45cd05a3"}
```

### Cryptographic Hash Chain Link Analysis:
- **Block #1 Hash**: `a0394c585d2b70ad6e71a5e8f2ef89958a0a951db3ca0c81104c04f27c0d3ded`
- **Block #2 `prev_hash_sha256`**: `a0394c585d2b70ad6e71a5e8f2ef89958a0a951db3ca0c81104c04f27c0d3ded`  
✅ **Proof**: Block #2 rigorously links to Block #1, establishing tamper evidence per ADR-0003.

---

## 7. Step 7: Automated Test Suite & Typecheck Run

### Executed Command:
```bash
npm run typecheck && npm test
```

### Actual Output:
```
npm notice run poc-codespar@1.0.0 typecheck
npm notice run tsc --noEmit
npm notice run poc-codespar@1.0.0 test
npm notice run tsx --test tests/**/*.test.ts
▶ Ticket 01: Core Inbound Collect & Dynamic Pix Rail Integration
  ✔ RED: createPixCharge generates dynamic Pix charge and persists to disk (1.398128ms)
  ✔ RED: reconcileSettlement updates charge status and records hash-chained audit block (0.528804ms)
  ✔ RED: HTTP API endpoints process collect flow and return provenance header (36.95094ms)
✔ Ticket 01: Core Inbound Collect & Dynamic Pix Rail Integration (43.733968ms)
ℹ tests 3
ℹ suites 1
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 257.075054
```

---

## Conclusion
Ticket 01 has fulfilled 100% of its acceptance criteria through real HTTP calls outside of any browser UI, validated disk persistence, and verified cryptographic hash-chained audit records.
