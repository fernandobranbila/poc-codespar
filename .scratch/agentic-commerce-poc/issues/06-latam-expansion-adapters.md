# 06: Multi-Country LATAM Expansion Adapters (Chile & Mexico)

**What to build:** Modular MCP provider adapter stubs for Chile (Flow.cl via HMAC-SHA256 signing) and Mexico (STP SPEI / SAT CFDI) implementing the unified CodeSpar commerce interface. This proves to leadership that the architecture is not locked to Brazil and can scale across Latin America without refactoring core agent orchestration logic (ADR-0002).

**Blocked by:** 05: Executive Interactive Presentation & Live Simulator Deck.

**Status:** ready-for-agent

- [ ] Provider configuration interface for `mcp-flow-cl` with HMAC-SHA256 request signing and currency handling (CLP).
- [ ] Provider configuration interface for Mexico STP SPEI and Facturama CFDI 4.0.
- [ ] Multi-country roadmap documentation and environment variable configuration guide.
- [ ] Sample curl tests for regional currency charge creation.
