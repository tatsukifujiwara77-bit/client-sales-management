import { ClientAlertsController } from './client-alerts.controller.js';
import type { AlertsService } from './alerts.service.js';

describe('ClientAlertsController', () => {
  it('delegates getDashboard() with the clientId scope', async () => {
    const service = {
      getDashboard: vi.fn().mockResolvedValue({ counts: {}, alerts: { items: [], total: 0, page: 1, pageSize: 50 } }),
    } as unknown as AlertsService;
    const controller = new ClientAlertsController(service);
    const query = { status: 'open' as const };

    await controller.getDashboard('client-1', query as any);

    expect(service.getDashboard).toHaveBeenCalledWith(query, 'client-1');
  });
});
