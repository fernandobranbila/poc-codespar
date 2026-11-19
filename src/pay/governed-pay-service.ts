import type { PersistentStore } from '../storage/persistent-store.js';
import type { AgentMandate, OutboundPayoutResult, ApprovalQueueItem, EngineProvenance } from '../types.js';

export interface RequestPayoutParams {
  supplierName: string;
  pixKey?: string;
  amountBrl: number;
  description?: string;
}

export interface ResolveApprovalQueueParams {
  action: 'APPROVE' | 'REJECT';
  managerEmail: string;
  notes?: string;
}

export class GovernedPayService {
  private store: PersistentStore;
  private mandate: AgentMandate;
  private engineProvenance: EngineProvenance;

  constructor(store: PersistentStore, mandate: AgentMandate) {
    this.store = store;
    this.mandate = mandate;
    const hasLiveKey = Boolean(process.env.CODESPAR_API_KEY && process.env.CODESPAR_API_KEY.length > 5);
    this.engineProvenance = hasLiveKey ? '[CODESPAR_LIVE_SANDBOX]' : '[SANDBOX_FALLBACK_SIMULATOR]';
  }

  public async requestPayout(params: RequestPayoutParams): Promise<OutboundPayoutResult> {
    const { supplierName, pixKey, amountBrl, description } = params;

    // Check whitelist
    if (!this.mandate.whitelistedVendors.includes(supplierName)) {
      throw new Error(`Vendor '${supplierName}' is not in the approved Agent Mandate whitelist.`);
    }

    const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (amountBrl <= this.mandate.autonomousSpendLimitBrl) {
      // Autonomous settlement
      const result: OutboundPayoutResult = {
        payoutId,
        supplierName,
        pixKey,
        amountBrl,
        mandateMode: 'AUTONOMOUS',
        status: 'SETTLED',
        settledAt: new Date().toISOString(),
        engineProvenance: this.engineProvenance
      };

      this.store.savePayout(result);
      this.store.appendAuditBlock(
        'OUTBOUND_PAY_SETTLED',
        payoutId,
        { supplierName, amountBrl, pixKey, mandateMode: 'AUTONOMOUS', description },
        this.engineProvenance
      );

      return result;
    } else {
      // Escalate to approval queue
      const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const queueItem: ApprovalQueueItem = {
        queueId,
        supplierName,
        pixKey,
        amountBrl,
        autonomousLimitBrl: this.mandate.autonomousSpendLimitBrl,
        description,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      this.store.saveApprovalQueueItem(queueItem);

      const result: OutboundPayoutResult = {
        payoutId,
        queueId,
        supplierName,
        pixKey,
        amountBrl,
        mandateMode: 'HUMAN_APPROVAL_QUEUE',
        status: 'PENDING_APPROVAL',
        engineProvenance: this.engineProvenance
      };

      this.store.savePayout(result);
      this.store.appendAuditBlock(
        'APPROVAL_QUEUE_ESCALATED',
        queueId,
        { supplierName, amountBrl, pixKey, mandateMode: 'HUMAN_APPROVAL_QUEUE', description },
        this.engineProvenance
      );

      return result;
    }
  }

  public async resolveApprovalQueue(
    queueId: string,
    params: ResolveApprovalQueueParams
  ): Promise<OutboundPayoutResult> {
    const { action, managerEmail, notes } = params;

    const queueItem = this.store.getApprovalQueueItem(queueId);
    if (!queueItem) {
      throw new Error(`Approval queue item '${queueId}' not found.`);
    }
    if (queueItem.status !== 'PENDING') {
      throw new Error(`Approval queue item '${queueId}' is already resolved.`);
    }

    const resolvedAt = new Date().toISOString();

    if (action === 'APPROVE') {
      const updatedQueue: ApprovalQueueItem = {
        ...queueItem,
        status: 'RESOLVED_APPROVED',
        resolvedAt,
        managerEmail,
        approverNotes: notes
      };
      this.store.saveApprovalQueueItem(updatedQueue);

      const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const result: OutboundPayoutResult = {
        payoutId,
        queueId,
        supplierName: queueItem.supplierName,
        pixKey: queueItem.pixKey,
        amountBrl: queueItem.amountBrl,
        mandateMode: 'HUMAN_APPROVAL_QUEUE',
        status: 'SETTLED',
        settledAt: resolvedAt,
        approverNotes: notes,
        engineProvenance: this.engineProvenance
      };

      this.store.savePayout(result);
      this.store.appendAuditBlock(
        'APPROVAL_QUEUE_APPROVED',
        queueId,
        { supplierName: queueItem.supplierName, amountBrl: queueItem.amountBrl, managerEmail, notes },
        this.engineProvenance
      );

      return result;
    } else {
      const updatedQueue: ApprovalQueueItem = {
        ...queueItem,
        status: 'RESOLVED_REJECTED',
        resolvedAt,
        managerEmail,
        approverNotes: notes
      };
      this.store.saveApprovalQueueItem(updatedQueue);

      // Find original payout for this queueId and mark it rejected
      const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const result: OutboundPayoutResult = {
        payoutId,
        queueId,
        supplierName: queueItem.supplierName,
        pixKey: queueItem.pixKey,
        amountBrl: queueItem.amountBrl,
        mandateMode: 'HUMAN_APPROVAL_QUEUE',
        status: 'REJECTED_BY_HUMAN',
        approverNotes: notes,
        engineProvenance: this.engineProvenance
      };

      this.store.savePayout(result);
      this.store.appendAuditBlock(
        'APPROVAL_QUEUE_REJECTED',
        queueId,
        { supplierName: queueItem.supplierName, amountBrl: queueItem.amountBrl, managerEmail, notes },
        this.engineProvenance
      );

      return result;
    }
  }

  public getEngineProvenance(): EngineProvenance {
    return this.engineProvenance;
  }
}
