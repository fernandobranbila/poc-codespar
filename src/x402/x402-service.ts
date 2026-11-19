import type { PersistentStore } from '../storage/persistent-store.js';

export class X402Service {
  private store: PersistentStore;
  private costBrl: number;

  constructor(store: PersistentStore, costBrl = 0.001) {
    this.store = store;
    this.costBrl = costBrl;
  }

  public createInvoice(costBrl?: number): { invoiceId: string; costBrl: number; rail: string } {
    const amount = costBrl ?? this.costBrl;
    const rand = Math.random().toString(36).substring(2, 9);
    const invoiceId = `inv_x402_${Date.now()}_${rand}`;
    return {
      invoiceId,
      costBrl: amount,
      rail: 'x402/pix-brl'
    };
  }

  public settleInvoice(invoiceId: string, amountBrl: number): { status: 'PAID'; paymentProof: string } {
    const rand = Math.random().toString(36).substring(2, 11);
    const paymentProof = `proof_tok_${rand}`;
    this.store.addX402Token(paymentProof);
    return { status: 'PAID', paymentProof };
  }

  public verifyProof(proofToken: string): boolean {
    return this.store.hasX402Token(proofToken);
  }
}
