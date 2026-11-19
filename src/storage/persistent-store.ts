import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type { PixCharge, NFeInvoice, LogisticsShipment, AuditBlock, StoreSchema, EngineProvenance } from '../types.js';

export class PersistentStore {
  private baseDir: string;
  private storePath: string;
  private auditPath: string;
  private state: StoreSchema;
  private auditEntries: AuditBlock[] = [];

  constructor(options?: { baseDir?: string }) {
    this.baseDir = options?.baseDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    this.storePath = path.join(this.baseDir, 'store.json');
    this.auditPath = path.join(this.baseDir, 'audit-trail.jsonl');

    this.state = this.loadStore();
    this.auditEntries = this.loadAuditTrail();
  }

  private loadStore(): StoreSchema {
    if (fs.existsSync(this.storePath)) {
      try {
        const raw = fs.readFileSync(this.storePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          charges: parsed.charges || {},
          nfe_invoices: parsed.nfe_invoices || {},
          shipments: parsed.shipments || {},
          payouts: parsed.payouts || {},
          approval_queue: parsed.approval_queue || {},
          x402_proof_tokens: parsed.x402_proof_tokens || []
        };
      } catch {
        // Fall back to empty store
      }
    }
    const initial: StoreSchema = {
      charges: {},
      nfe_invoices: {},
      shipments: {},
      payouts: {},
      approval_queue: {},
      x402_proof_tokens: []
    };
    this.saveStore(initial);
    return initial;
  }

  private saveStore(state: StoreSchema): void {
    fs.writeFileSync(this.storePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  private loadAuditTrail(): AuditBlock[] {
    const entries: AuditBlock[] = [];
    if (fs.existsSync(this.auditPath)) {
      const lines = fs.readFileSync(this.auditPath, 'utf-8').trim().split('\n');
      for (const line of lines) {
        if (line) {
          try {
            entries.push(JSON.parse(line));
          } catch {}
        }
      }
    }
    return entries;
  }

  public saveCharge(charge: PixCharge): void {
    this.state.charges[charge.chargeId] = charge;
    this.saveStore(this.state);
  }

  public getCharge(chargeId: string): PixCharge | undefined {
    return this.state.charges[chargeId];
  }

  public saveNFe(nfe: NFeInvoice): void {
    this.state.nfe_invoices[nfe.nfeKey] = nfe;
    this.saveStore(this.state);
  }

  public getNFe(nfeKey: string): NFeInvoice | undefined {
    return this.state.nfe_invoices[nfeKey];
  }

  public saveShipment(shipment: LogisticsShipment): void {
    this.state.shipments[shipment.shipmentId] = shipment;
    this.saveStore(this.state);
  }

  public getShipment(shipmentId: string): LogisticsShipment | undefined {
    return this.state.shipments[shipmentId];
  }

  public getStore(): StoreSchema {
    return JSON.parse(JSON.stringify(this.state));
  }

  public appendAuditBlock(
    action: string,
    entityId: string,
    payload: Record<string, any>,
    engineProvenance: EngineProvenance
  ): AuditBlock {
    const index = this.auditEntries.length + 1;
    const timestamp = new Date().toISOString();
    const prevHash = this.auditEntries.length > 0 
      ? this.auditEntries[this.auditEntries.length - 1].curr_hash_sha256 
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const hashPayload = `${index}|${timestamp}|${action}|${entityId}|${prevHash}|${JSON.stringify(payload)}`;
    const currHash = createHash('sha256').update(hashPayload).digest('hex');

    const block: AuditBlock = {
      index,
      timestamp,
      action,
      entityId,
      engineProvenance,
      payload,
      prev_hash_sha256: prevHash,
      curr_hash_sha256: currHash
    };

    this.auditEntries.push(block);
    fs.appendFileSync(this.auditPath, JSON.stringify(block) + '\n', 'utf-8');
    return block;
  }

  public getAuditEntries(): AuditBlock[] {
    return [...this.auditEntries];
  }

  public getAuditTrailText(): string {
    if (fs.existsSync(this.auditPath)) {
      return fs.readFileSync(this.auditPath, 'utf-8');
    }
    return '';
  }
}
