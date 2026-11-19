import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CollectService } from '../src/collect/collect-service.js';
import { PersistentStore } from '../src/storage/persistent-store.js';
import { createServer, Server } from 'node:http';
import { createHttpApp } from '../src/server/app.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data-test');

describe('Ticket 01: Core Inbound Collect & Dynamic Pix Rail Integration', () => {
  let store: PersistentStore;
  let service: CollectService;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    store = new PersistentStore({ baseDir: TEST_DATA_DIR });
    service = new CollectService(store);

    const app = createHttpApp(service, store);
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

  test('RED: createPixCharge generates dynamic Pix charge and persists to disk', async () => {
    const charge = await service.createCharge({
      amountBrl: 85.00,
      buyerName: 'Acme Corp',
      buyerEmail: 'buyer@acme.com',
      orderReference: 'ORD-001'
    });

    assert.ok(charge.chargeId.startsWith('ch_'));
    assert.equal(charge.amountBrl, 85.00);
    assert.equal(charge.currency, 'BRL');
    assert.equal(charge.status, 'AWAITING_PAYMENT');
    assert.ok(charge.pixCopyPaste.includes('br.gov.bcb.pix'));
    assert.equal(charge.engineProvenance, '[SANDBOX_FALLBACK_SIMULATOR]');

    // Verify persistence in data/store.json
    const persisted = store.getCharge(charge.chargeId);
    assert.deepEqual(persisted, charge);

    // Verify audit entry in audit-trail.jsonl
    const auditEntries = store.getAuditEntries();
    assert.ok(auditEntries.length >= 1);
    const lastEntry = auditEntries[auditEntries.length - 1];
    assert.equal(lastEntry.action, 'PIX_CHARGE_CREATED');
    assert.ok(lastEntry.curr_hash_sha256.length === 64);
  });

  test('RED: reconcileSettlement updates charge status and records hash-chained audit block', async () => {
    const charge = await service.createCharge({
      amountBrl: 120.00,
      buyerName: 'Beta LTDA',
      buyerEmail: 'beta@example.com'
    });

    const settled = await service.reconcileSettlement(charge.chargeId, 'E18290182490182');
    assert.equal(settled.status, 'SETTLED');
    assert.equal(settled.endToEndId, 'E18290182490182');
    assert.ok(settled.settledAt);

    // Check store updated
    const persisted = store.getCharge(charge.chargeId);
    assert.equal(persisted?.status, 'SETTLED');

    // Check audit hash chain
    const auditEntries = store.getAuditEntries();
    const settleEntry = auditEntries[auditEntries.length - 1];
    assert.equal(settleEntry.action, 'PIX_CHARGE_SETTLED');
    const prevEntry = auditEntries[auditEntries.length - 2];
    assert.equal(settleEntry.prev_hash_sha256, prevEntry.curr_hash_sha256);
  });

  test('RED: HTTP API endpoints process collect flow and return provenance header', async () => {
    // 1. POST /api/v1/collect/pix
    const resCreate = await fetch(`${baseUrl}/api/v1/collect/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_brl: 85.00,
        buyer: { name: 'Acme Corp', email: 'acme@test.com' },
        order_reference: 'ORD-HTTP-1'
      })
    });

    assert.equal(resCreate.status, 201);
    assert.equal(resCreate.headers.get('x-engine-provenance'), '[SANDBOX_FALLBACK_SIMULATOR]');
    const dataCreate = await resCreate.json() as any;
    assert.ok(dataCreate.charge_id);
    assert.equal(dataCreate.status, 'AWAITING_PAYMENT');

    // 2. GET /api/v1/collect/charges/:id
    const resGet = await fetch(`${baseUrl}/api/v1/collect/charges/${dataCreate.charge_id}`);
    assert.equal(resGet.status, 200);
    const dataGet = await resGet.json() as any;
    assert.equal(dataGet.chargeId, dataCreate.charge_id);

    // 3. POST /api/v1/webhooks/pix-settled
    const resWebhook = await fetch(`${baseUrl}/api/v1/webhooks/pix-settled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        charge_id: dataCreate.charge_id,
        end_to_end_id: 'E9999018240'
      })
    });
    assert.equal(resWebhook.status, 200);
    const dataWebhook = await resWebhook.json() as any;
    assert.equal(dataWebhook.status, 'RECONCILED');
    assert.equal(dataWebhook.payment_status, 'SETTLED');

    // 4. GET /api/v1/data/store (Live persistence consultation)
    const resStore = await fetch(`${baseUrl}/api/v1/data/store`);
    assert.equal(resStore.status, 200);
    const dataStore = await resStore.json() as any;
    assert.ok(dataStore.charges[dataCreate.charge_id]);

    // 5. GET /api/v1/data/audit-trail (Live audit ledger consultation)
    const resAudit = await fetch(`${baseUrl}/api/v1/data/audit-trail`);
    assert.equal(resAudit.status, 200);
    const textAudit = await resAudit.text();
    assert.ok(textAudit.includes('PIX_CHARGE_SETTLED'));
  });
});
