# 02: Automated Fiscal Compliance (SEFAZ NF-e) & Logistics Pipeline

**What to build:** An automated operational fulfillment pipeline that triggers immediately upon Pix settlement. The system calls the Fiscal MCP tool to issue an electronic Brazilian tax invoice (NF-e) with valid SEFAZ access key and DANFE format, then invokes the Logistics MCP tool (Melhor Envio) to compute freight and generate a trackable carrier shipment label.

**Blocked by:** 01: Core Inbound Collect & Dynamic Pix Rail Integration.

**Status:** ready-for-agent

- [ ] `POST /api/v1/fiscal/nfe/issue` generates a compliant NF-e object with 44-digit SEFAZ key, protocol number, and `AUTHORIZED` status.
- [ ] `POST /api/v1/logistics/shipment` calculates freight and returns carrier tracking code (Melhor Envio format) and printable shipping label reference.
- [ ] Automated webhook or event listener chains Pix settlement directly into NF-e emission and logistics creation without human intervention.
- [ ] All operations verifiable via copy-pasteable HTTP curl commands.
