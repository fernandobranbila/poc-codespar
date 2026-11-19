import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createServer, Server } from 'node:http';
import { PersistentStore } from '../src/storage/persistent-store.js';
import { CollectService } from '../src/collect/collect-service.js';
import { X402Service } from '../src/x402/x402-service.js';
import { createHttpApp } from '../src/server/app.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data-test-x402');

describe('Ticket 04: x402 Micropayments — Agent-to-Agent Market Quotes', () => {
  let store: PersistentStore;
  let collectService: CollectService;
  let x402Service: X402Service;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    store = new PersistentStore({ baseDir: TEST_DATA_DIR });
    collectService = new CollectService(store);
    x402Service = new X402Service(store, 0.001);

    const app = createHttpApp({
      collectService,
      x402Service,
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

  test('GET /api/v1/a2a/market-quotes without proof returns HTTP 402 with invoice', async () => {
    const res = await fetch(`${baseUrl}/api/v1/a2a/market-quotes`);
    assert.equal(res.status, 402);
    const data = await res.json() as any;
    assert.ok(data.invoice);
    assert.ok(data.invoice.invoiceId.startsWith('inv_x402_'));
    assert.ok(data.invoice.costBrl > 0);
    assert.equal(data.invoice.rail, 'x402/pix-brl');
  });

  test('POST /api/v1/x402/settle returns a payment proof token', async () => {
    // First get an invoice
    const quoteRes = await fetch(`${baseUrl}/api/v1/a2a/market-quotes`);
    const quoteData = await quoteRes.json() as any;
    const { invoiceId, costBrl } = quoteData.invoice;

    // Settle the invoice
    const settleRes = await fetch(`${baseUrl}/api/v1/x402/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, amount_brl: costBrl })
    });
    assert.equal(settleRes.status, 200);
    const settleData = await settleRes.json() as any;
    assert.equal(settleData.status, 'PAID');
    assert.ok(settleData.payment_proof.startsWith('proof_tok_'));
  });

  test('GET /api/v1/a2a/market-quotes with valid proof returns HTTP 200 with market data', async () => {
    // Get invoice
    const quoteRes = await fetch(`${baseUrl}/api/v1/a2a/market-quotes`);
    const quoteData = await quoteRes.json() as any;
    const { invoiceId, costBrl } = quoteData.invoice;

    // Settle
    const settleRes = await fetch(`${baseUrl}/api/v1/x402/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, amount_brl: costBrl })
    });
    const settleData = await settleRes.json() as any;
    const proof = settleData.payment_proof;

    // Retry with proof
    const marketRes = await fetch(`${baseUrl}/api/v1/a2a/market-quotes`, {
      headers: { 'X-Payment-Proof': proof }
    });
    assert.equal(marketRes.status, 200);
    const marketData = await marketRes.json() as any;
    assert.ok(Array.isArray(marketData.quotes));
    assert.ok(marketData.quotes.length > 0);
    assert.ok(marketData.quotes[0].ticker);
    assert.ok(marketData.quotes[0].price);
  });

  test('X402Service.createInvoice generates correct format', () => {
    const invoice = x402Service.createInvoice(0.005);
    assert.ok(invoice.invoiceId.startsWith('inv_x402_'));
    assert.equal(invoice.costBrl, 0.005);
    assert.equal(invoice.rail, 'x402/pix-brl');
  });

  test('X402Service.settleInvoice and verifyProof round-trip works', () => {
    const invoice = x402Service.createInvoice(0.001);
    const settlement = x402Service.settleInvoice(invoice.invoiceId, invoice.costBrl);
    assert.equal(settlement.status, 'PAID');
    assert.ok(settlement.paymentProof.startsWith('proof_tok_'));
    assert.equal(x402Service.verifyProof(settlement.paymentProof), true);
    assert.equal(x402Service.verifyProof('proof_tok_invalid'), false);
  });

  test('GET /api/v1/a2a/market-quotes with invalid proof returns 402', async () => {
    const res = await fetch(`${baseUrl}/api/v1/a2a/market-quotes`, {
      headers: { 'X-Payment-Proof': 'proof_tok_totally_fake' }
    });
    assert.equal(res.status, 402);
  });
});
