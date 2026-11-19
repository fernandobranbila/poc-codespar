/**
 * Core Domain Types for CodeSpar Agentic Commerce POC
 * Aligned with GLOSSARY.md and ADR-0001, ADR-0002, ADR-0003
 */

export type EngineProvenance = '[CODESPAR_LIVE_SANDBOX]' | '[SANDBOX_FALLBACK_SIMULATOR]';

export type ChargeStatus = 'AWAITING_PAYMENT' | 'SETTLED' | 'EXPIRED';

export interface PixCharge {
  chargeId: string;
  amountBrl: number;
  currency: 'BRL';
  buyerName: string;
  buyerEmail: string;
  orderReference?: string;
  pixCopyPaste: string;
  qrCodeSvg: string;
  status: ChargeStatus;
  engineProvenance: EngineProvenance;
  createdAt: string;
  settledAt?: string;
  endToEndId?: string;
}

export interface NFeItem {
  description: string;
  quantity: number;
  unitPriceBrl: number;
}

export interface NFeInvoice {
  nfeKey: string;
  protocolNumber: string;
  chargeId?: string;
  buyerName: string;
  buyerTaxId?: string;
  totalBrl: number;
  items: NFeItem[];
  status: 'AUTHORIZED' | 'PENDING' | 'REJECTED';
  danfeXmlUrl: string;
  engineProvenance: EngineProvenance;
  issuedAt: string;
}

export interface LogisticsShipment {
  shipmentId: string;
  orderReference?: string;
  carrier: 'Melhor Envio' | 'Correios' | 'Jadlog';
  trackingCode: string;
  destinationCity: string;
  destinationPostalCode?: string;
  weightKg: number;
  status: 'LABEL_GENERATED' | 'IN_TRANSIT' | 'DELIVERED';
  labelPdfUrl: string;
  engineProvenance: EngineProvenance;
  createdAt: string;
}

export interface AgentMandate {
  autonomousSpendLimitBrl: number;
  whitelistedVendors: string[];
  expirationTtlMinutes?: number;
}

export interface OutboundPayoutResult {
  payoutId: string;
  queueId?: string;
  supplierName: string;
  pixKey?: string;
  amountBrl: number;
  mandateMode: 'AUTONOMOUS' | 'HUMAN_APPROVAL_QUEUE';
  status: 'SETTLED' | 'PENDING_APPROVAL' | 'REJECTED_BY_HUMAN';
  settledAt?: string;
  approverNotes?: string;
  engineProvenance: EngineProvenance;
}

export interface ApprovalQueueItem {
  queueId: string;
  supplierName: string;
  pixKey?: string;
  amountBrl: number;
  autonomousLimitBrl: number;
  description?: string;
  status: 'PENDING' | 'RESOLVED_APPROVED' | 'RESOLVED_REJECTED';
  createdAt: string;
  resolvedAt?: string;
  managerEmail?: string;
  approverNotes?: string;
}

export interface AuditBlock {
  index: number;
  timestamp: string;
  action: string;
  entityId: string;
  engineProvenance: EngineProvenance;
  payload: Record<string, any>;
  prev_hash_sha256: string;
  curr_hash_sha256: string;
}

export interface StoreSchema {
  charges: Record<string, PixCharge>;
  nfe_invoices: Record<string, NFeInvoice>;
  shipments: Record<string, LogisticsShipment>;
  payouts: Record<string, OutboundPayoutResult>;
  approval_queue: Record<string, ApprovalQueueItem>;
  x402_proof_tokens: string[];
}
