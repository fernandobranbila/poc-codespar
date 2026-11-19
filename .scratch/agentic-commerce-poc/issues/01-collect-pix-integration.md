# 01: Core Inbound Collect & Dynamic Pix Rail Integration

**What to build:** An end-to-end inbound collection flow where a buyer can purchase goods or services via an instant Pix transaction. When an order is placed, the system produces a dynamic EMV Pix QR code and Copia e Cola payload, waits for BACEN webhook reconciliation, marks the charge as settled, and records the active engine provenance (`[CODESPAR_LIVE_SANDBOX]` or `[SANDBOX_FALLBACK_SIMULATOR]`) per ADR-0001. All operations must be executable via HTTP curl calls.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] `POST /api/v1/collect/pix` creates a dynamic charge returning `charge_id`, `amount_brl`, EMV QR code string, and expiration timestamp.
- [x] `POST /api/v1/webhooks/pix-settled` receives simulated or live BACEN settlement webhooks and reconciles order state to `SETTLED`.
- [x] `GET /api/v1/collect/charges/{id}` returns the real-time status and payment proof.
- [x] Every response explicitly includes the `engine_provenance` header/field.
- [x] Works cleanly in CodeSpar free sandbox tier and local fallback.
