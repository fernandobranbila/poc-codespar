import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createServer, Server } from 'node:http';
import { PersistentStore } from '../src/storage/persistent-store.js';
import { CollectService } from '../src/collect/collect-service.js';
import { GovernedPayService } from '../src/pay/governed-pay-service.js';
import { createHttpApp } from '../src/server/app.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data-test-pay');

describe('Ticket 03: Governed Outbound Pay with Verifiable Agent Mandates & Approval Queue', () => {
  let store: PersistentStore;
  let collectService: CollectService;
  let payService: GovernedPayService;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    store = new PersistentStore({ baseDir: TEST_DATA_DIR });
    collectService = new CollectService(store);
    payService = new GovernedPayService(store, {
      autonomousSpendLimitBrl: 200.00,
      whitelistedVendors: ['Supplier Corp Brazil', 'TechDistributor SA', 'CloudCompute LTDA']
    });

    const app = createHttpApp({
      collectService,
      payService,
      store
    });

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as any;
    baseUrl = `http://localhost:${addr.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test('RED: Autonomous payout succeeds when within mandate spending limit (R$ 85 <= R$ 200)', async () => {
    const result = await payService.requestPayout({
      supplierName: 'Supplier Corp Brazil',
      pixKey: 'finance@supplier.com.br',
      amountBrl: 85.00,
      description: 'Restock order'
    });

    assert.equal(result.mandateMode, 'AUTONOMOUS');
    assert.equal(result.status, 'SETTLED');
    assert.ok(result.payoutId.startsWith('pay_'));
    assert.ok(result.settledAt);

    // Verify stored in data/store.json
    const stored = store.getPayout(result.payoutId);
    assert.deepEqual(stored, result);

    // Verify audit entry
    const audit = store.getAuditEntries();
    const last = audit[audit.length - 1];
    assert.equal(last.action, 'OUTBOUND_PAY_SETTLED');
    assert.equal(last.payload.mandateMode, 'AUTONOMOUS');
  });

  test('RED: Payout exceeding mandate spending limit (R$ 450 > R$ 200) escalates to Approval Queue', async () => {
    const result = await payService.requestPayout({
      supplierName: 'Supplier Corp Brazil',
      pixKey: 'finance@supplier.com.br',
      amountBrl: 450.00,
      description: 'Enterprise Cluster Restock'
    });

    assert.equal(result.mandateMode, 'HUMAN_APPROVAL_QUEUE');
    assert.equal(result.status, 'PENDING_APPROVAL');
    assert.ok(result.queueId);

    // Verify stored in approval queue on disk
    const queued = store.getApprovalQueueItem(result.queueId!);
    assert.ok(queued);
    assert.equal(queued.amountBrl, 450.00);

    // Verify audit entry
    const audit = store.getAuditEntries();
    const last = audit[audit.length - 1];
    assert.equal(last.action, 'APPROVAL_QUEUE_ESCALATED');
  });

  test('RED: Manager sign-off in Approval Queue authorizes held payment', async () => {
    // 1. Trigger escalation
    const request = await payService.requestPayout({
      supplierName: 'TechDistributor SA',
      pixKey: 'tech@distributor.com.br',
      amountBrl: 500.00
    });
    assert.ok(request.queueId);

    // 2. Sign-off
    const signOff = await payService.resolveApprovalQueue(request.queueId!, {
      action: 'APPROVE',
      managerEmail: 'cto@company.com',
      notes: 'Approved for hardware upgrade'
    });

    assert.equal(signOff.status, 'SETTLED');
    assert.equal(signOff.mandateMode, 'HUMAN_APPROVAL_QUEUE');
    assert.ok(signOff.payoutId);
    assert.equal(signOff.approverNotes, 'Approved for hardware upgrade');

    // Verify queue item cleared/settled
    const queued = store.getApprovalQueueItem(request.queueId!);
    assert.equal(queued?.status, 'RESOLVED_APPROVED');

    // Verify audit entry
    const audit = store.getAuditEntries();
    const last = audit[audit.length - 1];
    assert.equal(last.action, 'APPROVAL_QUEUE_APPROVED');
  });

  test('RED: Non-whitelisted vendor is rejected by mandate guardrails', async () => {
    await assert.rejects(
      async () => {
        await payService.requestPayout({
          supplierName: 'Unknown Shady Vendor',
          pixKey: 'shady@fake.com',
          amountBrl: 50.00
        });
      },
      { message: /not in the approved Agent Mandate whitelist/ }
    );
  });

  test('RED: HTTP API endpoints for /api/v1/pay/pix-transfer and approval queue sign-off', async () => {
    // 1. Post autonomous payment
    const resAuto = await fetch(`${baseUrl}/api/v1/pay/pix-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_name: 'Supplier Corp Brazil',
        amount_brl: 85.00
      })
    });
    assert.equal(resAuto.status, 200);
    const dataAuto = await resAuto.json() as any;
    assert.equal(dataAuto.mandate_mode, 'AUTONOMOUS');
    assert.equal(dataAuto.status, 'SETTLED');

    // 2. Post high-ticket payment (Escalates to 202 Accepted)
    const resStepUp = await fetch(`${baseUrl}/api/v1/pay/pix-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_name: 'Supplier Corp Brazil',
        amount_brl: 450.00
      })
    });
    assert.equal(resStepUp.status, 202);
    const dataStepUp = await resStepUp.json() as any;
    assert.ok(dataStepUp.queue_id);
    assert.equal(dataStepUp.status, 'ESCALATED_TO_APPROVAL_QUEUE');

    // 3. Manager sign-off via HTTP
    const resSignOff = await fetch(`${baseUrl}/api/v1/governance/approval-queue/${dataStepUp.queue_id}/sign-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPROVE',
        manager_email: 'finance@company.com',
        notes: 'Approved via HTTP test'
      })
    });
    assert.equal(resSignOff.status, 200);
    const dataSignOff = await resSignOff.json() as any;
    assert.equal(dataSignOff.status, 'SETTLED');
    assert.equal(dataSignOff.mandate_mode, 'HUMAN_APPROVAL_QUEUE');
  });
});
