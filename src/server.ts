import { createServer } from 'node:http';
import { PersistentStore } from './storage/persistent-store.js';
import { CollectService } from './collect/collect-service.js';
import { FiscalService } from './fiscal/fiscal-service.js';
import { LogisticsService } from './logistics/logistics-service.js';
import { GovernedPayService } from './pay/governed-pay-service.js';
import { X402Service } from './x402/x402-service.js';
import { createHttpApp } from './server/app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const store = new PersistentStore();
const collectService = new CollectService(store);
const fiscalService = new FiscalService(store);
const logisticsService = new LogisticsService(store);
const payService = new GovernedPayService(store, {
  autonomousSpendLimitBrl: 200.00,
  whitelistedVendors: ['Supplier Corp Brazil', 'TechDistributor SA', 'CloudCompute LTDA']
});
const x402Service = new X402Service(store);

const app = createHttpApp({
  collectService,
  fiscalService,
  logisticsService,
  payService,
  x402Service,
  store
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`⚡  CODESPAR AGENTIC COMMERCE API RUNNING AT http://localhost:${PORT}`);
  console.log(`=============================================================`);
  console.log(`Provenance: ${collectService.getEngineProvenance()}`);
  console.log(`Active State: data/store.json`);
  console.log(`Audit Trail:  data/audit-trail.jsonl`);
  console.log(`Services: Collect (Pix), Fiscal (NF-e), Logistics (Melhor Envio), Governed Pay, x402`);
  console.log(`Ready for cURL calls from docs/api/http-curls.md\n`);
});
