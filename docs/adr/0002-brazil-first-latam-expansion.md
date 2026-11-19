# 0002 - Brazil-First Focus with Modular LATAM Multi-Country Expansion

## Status
Accepted

## Context
CodeSpar supports multi-country financial rails across Latin America—including Brazil (Pix, boletos), Chile (`mcp-flow-cl`), Mexico (SPEI), Colombia (PSE), and Argentina. For the initial executive proof-of-concept presented to the CEO and CTO, we need deep end-to-end execution across messaging, collection, fiscal compliance (NF-e), logistics, and governed supplier payments without spreading focus across distinct regulatory jurisdictions.

## Decision
We focus the live POC demo and interactive simulator exclusively on Brazil (Pix instant settlement, SEFAZ NF-e simulation, and domestic shipping), while documenting the modular expansion architecture and MCP tool mapping for Chile, Mexico, and Colombia. All features operate within the free/sandbox tier.

## Consequences
- The live demonstration has a cohesive end-to-end narrative matching Brazil's mature instant payment ecosystem (Pix).
- CodeSpar MCP interfaces for additional countries (such as Flow in Chile or STP in Mexico) remain decoupled and ready to activate via environment configuration without refactoring core agent orchestration logic.
