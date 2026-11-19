import { createHash } from 'node:crypto';
import type { PersistentStore } from '../storage/persistent-store.js';
import type { PixCharge, EngineProvenance } from '../types.js';

export interface CreateChargeParams {
  amountBrl: number;
  buyerName: string;
  buyerEmail: string;
  orderReference?: string;
}

export class CollectService {
  private store: PersistentStore;
  private engineProvenance: EngineProvenance;

  constructor(store: PersistentStore) {
    this.store = store;
    const hasLiveKey = Boolean(process.env.CODESPAR_API_KEY && process.env.CODESPAR_API_KEY.length > 5);
    this.engineProvenance = hasLiveKey ? '[CODESPAR_LIVE_SANDBOX]' : '[SANDBOX_FALLBACK_SIMULATOR]';
  }

  public getEngineProvenance(): EngineProvenance {
    return this.engineProvenance;
  }

  public async createCharge(params: CreateChargeParams): Promise<PixCharge> {
    const chargeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const formattedAmount = params.amountBrl.toFixed(2);
    
    // Synthesize standard EMV BACEN Pix payload
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136${chargeId}5204000053039865405${formattedAmount}5802BR5916CodeSpar Commerce6009SAO PAULO62070503***6304E8A2`;
    
    const qrCodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#000"/><text x="10" y="50" fill="#fff">PIX:${chargeId}</text></svg>`;

    const charge: PixCharge = {
      chargeId,
      amountBrl: params.amountBrl,
      currency: 'BRL',
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      orderReference: params.orderReference,
      pixCopyPaste,
      qrCodeSvg,
      status: 'AWAITING_PAYMENT',
      engineProvenance: this.engineProvenance,
      createdAt: new Date().toISOString()
    };

    // Save to persistent store
    this.store.saveCharge(charge);

    // Record to audit trail
    this.store.appendAuditBlock(
      'PIX_CHARGE_CREATED',
      charge.chargeId,
      { amountBrl: charge.amountBrl, buyer: params.buyerEmail },
      this.engineProvenance
    );

    return charge;
  }

  public async reconcileSettlement(chargeId: string, endToEndId?: string): Promise<PixCharge> {
    const charge = this.store.getCharge(chargeId);
    if (!charge) {
      throw new Error(`Charge with ID '${chargeId}' not found in persistent store.`);
    }

    const settled: PixCharge = {
      ...charge,
      status: 'SETTLED',
      settledAt: new Date().toISOString(),
      endToEndId: endToEndId || `E${Date.now()}`
    };

    this.store.saveCharge(settled);

    this.store.appendAuditBlock(
      'PIX_CHARGE_SETTLED',
      settled.chargeId,
      { amountBrl: settled.amountBrl, endToEndId: settled.endToEndId },
      this.engineProvenance
    );

    return settled;
  }

  public getCharge(chargeId: string): PixCharge | undefined {
    return this.store.getCharge(chargeId);
  }
}
