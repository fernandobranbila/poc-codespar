# 0003 - Local File-Based Persistence with Real-Time Live Consultation

## Status
Accepted

## Context
The CodeSpar Agentic Commerce proof-of-concept requires persistent storage for active entity states (Pix charges, approval queue items, x402 tokens) and a tamper-evident audit ledger. Requiring an external database (e.g., PostgreSQL or Redis) would introduce deployment complexity and setup friction for reviewers. Conversely, pure in-memory state would cause data loss upon server restart or between independent `curl` calls.

## Decision
1. We persist active commerce state in an atomic JSON file: `data/store.json`.
2. We persist the tamper-evident audit ledger as an append-only, hash-chained JSON Lines file: `data/audit-trail.jsonl`, where every transaction includes the SHA-256 hash of the preceding entry.
3. The HTTP server exposes direct inspection endpoints (`GET /api/v1/data/store` and `GET /api/v1/data/audit-trail`).
4. The executive presentation (`presentation.html`) includes a dedicated "Live Ledger & Files" tab providing near real-time consultation of these persistent files as transactions execute.

## Consequences
- Zero external database dependencies; runs anywhere with immediate disk persistence.
- High audit transparency: reviewers can inspect state files via `cat`, `jq`, standard `curl`, or directly inside the presentation UI.
- All transactions survive server restarts and CLI session boundaries.
