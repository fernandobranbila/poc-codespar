import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createServer, Server } from 'node:http';
import { PersistentStore } from '../src/storage/persistent-store.js';
import { CollectService } from '../src/collect/collect-service.js';
import { FiscalService } from '../src/fiscal/fiscal-service.js';
import { LogisticsService } from '../src/logistics/logistics-service.js';
import { createHttpApp } from '../src/server/app.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data-test-fiscal');

describe('Ticket 02: Automated Fiscal Compliance (SEFAZ NF-e) & Logistics Pipeline', () => {
  let store: PersistentStore;
  let collectService: CollectService;
  let fiscalService: FiscalService;
  let logisticsService: LogisticsService;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    store = new PersistentStore({ baseDir: TEST_DATA_DIR });
    collectService = new CollectService(store);
    fiscalService = new FiscalService(store);
    logisticsService = new LogisticsService(store);

    const app = createHttpApp({
      collectService,
      fiscalService,
      logisticsService,
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

  test('RED: FiscalService issues valid 44-digit SEFAZ NF-e and records to persistent store and audit trail', async () => {
    const nfe = await fiscalService.issueNFe({
      chargeId: 'ch_test_123',
      buyerName: 'Acme Client LTDA',
      buyerTaxId: '12.345.678/0001-90',
      totalBrl: 85.00,
      items: [{ description: 'Dev Kit', quantity: 2, unitPriceBrl: 42.50 }]
    });

    assert.equal(nfe.status, 'AUTHORIZED');
    assert.equal(nfe.totalBrl, 85.00);
    assert.equal(nfe.nfeKey.length, 44, 'SEFAZ NF-e key must be exactly 44 digits');
    assert.ok(nfe.protocolNumber.startsWith('PR-'));
    assert.equal(nfe.engineProvenance, '[SANDBOX_FALLBACK_SIMULATOR]');

    // Verify stored on disk
    const storedNFe = store.getNFe(nfe.nfeKey);
    assert.deepEqual(storedNFe, nfe);

    // Verify audit block
    const audit = store.getAuditEntries();
    const lastBlock = audit[audit.length - 1];
    assert.equal(lastBlock.action, 'NFE_ISSUED');
    assert.equal(lastBlock.entityId, nfe.nfeKey);
  });

  test('RED: LogisticsService generates Melhor Envio shipment tracking code and label', async () => {
    const shipment = await logisticsService.createShipment({
      orderReference: 'ORD-TEST-002',
      destinationCity: 'São Paulo - SP',
      destinationPostalCode: '01310-100',
      weightKg: 1.2
    });

    assert.equal(shipment.carrier, 'Melhor Envio');
    assert.ok(shipment.trackingCode.startsWith('BR'));
    assert.equal(shipment.status, 'LABEL_GENERATED');
    assert.ok(shipment.labelPdfUrl.includes(shipment.trackingCode));

    // Verify stored on disk
    const storedShipment = store.getShipment(shipment.shipmentId);
    assert.deepEqual(storedShipment, shipment);

    // Verify audit block
    const audit = store.getAuditEntries();
    const lastBlock = audit[audit.length - 1];
    assert.equal(lastBlock.action, 'SHIPMENT_LABEL_GENERATED');
    assert.equal(lastBlock.entityId, shipment.shipmentId);
  });

  test('RED: HTTP endpoints /api/v1/fiscal/nfe/issue and /api/v1/logistics/shipment', async () => {
    // 1. Fiscal HTTP Endpoint
    const resFiscal = await fetch(`${baseUrl}/api/v1/fiscal/nfe/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        charge_id: 'ch_http_1',
        buyer_name: 'Test Corp',
        buyer_tax_id: '98.765.432/0001-10',
        total_brl: 150.00,
        items: [{ description: 'Enterprise Hub', quantity: 1, unitPriceBrl: 150.00 }]
      })
    });

    assert.equal(resFiscal.status, 200);
    assert.equal(resFiscal.headers.get('x-engine-provenance'), '[SANDBOX_FALLBACK_SIMULATOR]');
    const dataFiscal = await resFiscal.json() as any;
    assert.equal(dataFiscal.status, 'AUTHORIZED');
    assert.equal(dataFiscal.nfe_key.length, 44);

    // 2. Logistics HTTP Endpoint
    const resLogistics = await fetch(`${baseUrl}/api/v1/logistics/shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: 'ORD-HTTP-1',
        destination_city: 'Rio de Janeiro - RJ',
        destination_postal_code: '20040-002',
        weight_kg: 0.8
      })
    });

    assert.equal(resLogistics.status, 200);
    assert.equal(resLogistics.headers.get('x-engine-provenance'), '[SANDBOX_FALLBACK_SIMULATOR]');
    const dataLogistics = await resLogistics.json() as any;
    assert.ok(dataLogistics.tracking_code);
    assert.equal(dataLogistics.carrier, 'Melhor Envio');
  });

  test('RED: Automated fulfillment chaining: Pix settlement automatically triggers NF-e and Logistics', async () => {
    // Create charge
    const charge = await collectService.createCharge({
      amountBrl: 200.00,
      buyerName: 'Automated Client',
      buyerEmail: 'auto@client.com',
      orderReference: 'ORD-AUTO-CHAIN'
    });

    // Settle charge via HTTP webhook with auto_fulfill=true
    const resWebhook = await fetch(`${baseUrl}/api/v1/webhooks/pix-settled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        charge_id: charge.chargeId,
        end_to_end_id: 'E777888999',
        auto_fulfill: true,
        destination_city: 'Curitiba - PR'
      })
    });

    assert.equal(resWebhook.status, 200);
    const dataWebhook = await resWebhook.json() as any;
    assert.equal(dataWebhook.payment_status, 'SETTLED');
    assert.ok(dataWebhook.fulfillment);
    assert.ok(dataWebhook.fulfillment.nfe_key);
    assert.ok(dataWebhook.fulfillment.tracking_code);

    // Verify stored
    const storedCharge = store.getCharge(charge.chargeId);
    assert.equal(storedCharge?.status, 'SETTLED');
    const storedNFe = store.getNFe(dataWebhook.fulfillment.nfe_key);
    assert.ok(storedNFe);
    const storedShipment = store.getShipment(dataWebhook.fulfillment.shipment_id);
    assert.ok(storedShipment);
  });
});
