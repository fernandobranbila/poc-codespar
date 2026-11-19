import { IncomingMessage, ServerResponse } from 'node:http';
import type { CollectService } from '../collect/collect-service.js';
import type { FiscalService } from '../fiscal/fiscal-service.js';
import type { LogisticsService } from '../logistics/logistics-service.js';
import type { PersistentStore } from '../storage/persistent-store.js';

export interface AppDependencies {
  collectService: CollectService;
  fiscalService?: FiscalService;
  logisticsService?: LogisticsService;
  store: PersistentStore;
}

export function createHttpApp(depsOrCollect: AppDependencies | CollectService, maybeStore?: PersistentStore) {
  let collectService: CollectService;
  let fiscalService: FiscalService | undefined;
  let logisticsService: LogisticsService | undefined;
  let store: PersistentStore;

  if ('collectService' in depsOrCollect) {
    collectService = depsOrCollect.collectService;
    fiscalService = depsOrCollect.fiscalService;
    logisticsService = depsOrCollect.logisticsService;
    store = depsOrCollect.store;
  } else {
    collectService = depsOrCollect;
    store = maybeStore!;
  }

  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const method = req.method?.toUpperCase();
    const provenance = collectService.getEngineProvenance();

    const sendJson = (status: number, data: any) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'X-Engine-Provenance': provenance
      });
      res.end(JSON.stringify(data, null, 2));
    };

    const readBody = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (err) {
            reject(err);
          }
        });
        req.on('error', reject);
      });
    };

    try {
      // 1. POST /api/v1/collect/pix
      if (method === 'POST' && url.pathname === '/api/v1/collect/pix') {
        const body = await readBody();
        const amountBrl = Number(body.amount_brl) || 85.00;
        const buyerName = body.buyer?.name || 'Customer';
        const buyerEmail = body.buyer?.email || 'customer@example.com';
        const orderReference = body.order_reference;

        const charge = await collectService.createCharge({
          amountBrl,
          buyerName,
          buyerEmail,
          orderReference
        });

        return sendJson(201, {
          charge_id: charge.chargeId,
          amount_brl: charge.amountBrl,
          currency: charge.currency,
          pix_copy_paste: charge.pixCopyPaste,
          status: charge.status,
          engine_provenance: charge.engineProvenance,
          created_at: charge.createdAt
        });
      }

      // 2. POST /api/v1/webhooks/pix-settled
      if (method === 'POST' && url.pathname === '/api/v1/webhooks/pix-settled') {
        const body = await readBody();
        const chargeId = body.charge_id;
        const endToEndId = body.end_to_end_id;

        const settled = await collectService.reconcileSettlement(chargeId, endToEndId);

        let fulfillment: any = null;
        if (body.auto_fulfill && fiscalService && logisticsService) {
          const nfe = await fiscalService.issueNFe({
            chargeId: settled.chargeId,
            buyerName: settled.buyerName,
            totalBrl: settled.amountBrl
          });

          const shipment = await logisticsService.createShipment({
            orderReference: settled.orderReference || settled.chargeId,
            destinationCity: body.destination_city || 'São Paulo - SP'
          });

          fulfillment = {
            nfe_key: nfe.nfeKey,
            protocol_number: nfe.protocolNumber,
            tracking_code: shipment.trackingCode,
            shipment_id: shipment.shipmentId
          };
        }

        return sendJson(200, {
          status: 'RECONCILED',
          charge_id: settled.chargeId,
          payment_status: settled.status,
          settled_at: settled.settledAt,
          fulfillment
        });
      }

      // 3. GET /api/v1/collect/charges/:id
      if (method === 'GET' && url.pathname.startsWith('/api/v1/collect/charges/')) {
        const id = url.pathname.replace('/api/v1/collect/charges/', '');
        const charge = collectService.getCharge(id);
        if (!charge) {
          return sendJson(404, { error: `Charge '${id}' not found` });
        }
        return sendJson(200, charge);
      }

      // 4. POST /api/v1/fiscal/nfe/issue
      if (method === 'POST' && url.pathname === '/api/v1/fiscal/nfe/issue') {
        if (!fiscalService) {
          return sendJson(501, { error: 'FiscalService not configured in app' });
        }
        const body = await readBody();
        const nfe = await fiscalService.issueNFe({
          chargeId: body.charge_id,
          buyerName: body.buyer_name || 'Customer',
          buyerTaxId: body.buyer_tax_id,
          totalBrl: Number(body.total_brl) || 85.00,
          items: body.items
        });

        return sendJson(200, {
          nfe_key: nfe.nfeKey,
          protocol_number: nfe.protocolNumber,
          status: nfe.status,
          total_brl: nfe.totalBrl,
          danfe_xml_url: nfe.danfeXmlUrl,
          issued_at: nfe.issuedAt
        });
      }

      // 5. POST /api/v1/logistics/shipment
      if (method === 'POST' && url.pathname === '/api/v1/logistics/shipment') {
        if (!logisticsService) {
          return sendJson(501, { error: 'LogisticsService not configured in app' });
        }
        const body = await readBody();
        const shipment = await logisticsService.createShipment({
          orderReference: body.order_id,
          destinationCity: body.destination_city || 'São Paulo - SP',
          destinationPostalCode: body.destination_postal_code,
          weightKg: Number(body.weight_kg) || 1.0
        });

        return sendJson(200, {
          shipment_id: shipment.shipmentId,
          carrier: shipment.carrier,
          tracking_code: shipment.trackingCode,
          status: shipment.status,
          label_pdf_url: shipment.labelPdfUrl
        });
      }

      // 6. GET /api/v1/data/store
      if (method === 'GET' && url.pathname === '/api/v1/data/store') {
        return sendJson(200, store.getStore());
      }

      // 7. GET /api/v1/data/audit-trail
      if (method === 'GET' && url.pathname === '/api/v1/data/audit-trail') {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'X-Engine-Provenance': provenance
        });
        return res.end(store.getAuditTrailText());
      }

      // Default 404
      return sendJson(404, { error: 'Not found', path: url.pathname });
    } catch (err: any) {
      return sendJson(500, { error: 'Internal Server Error', message: err.message });
    }
  };
}
