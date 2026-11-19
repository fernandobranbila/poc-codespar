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
  payouts: Record<string, any>;
  approval_queue: Record<string, any>;
  x402_proof_tokens: string[];
}
