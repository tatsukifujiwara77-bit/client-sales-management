import { DashboardController } from './dashboard.controller.js';
import type { DashboardService } from './dashboard.service.js';

describe('DashboardController', () => {
  it('delegates getDashboard() to the service', async () => {
    const service = { getDashboard: vi.fn().mockResolvedValue({ kpis: {} }) } as unknown as DashboardService;
    const controller = new DashboardController(service);

    await controller.getDashboard();

    expect(service.getDashboard).toHaveBeenCalled();
  });
});
