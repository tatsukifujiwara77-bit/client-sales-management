import { ForbiddenException } from '@nestjs/common';
import { AlertsController } from './alerts.controller.js';
import type { AlertsService } from './alerts.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

function buildUser(role: AuthUser['role']): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    fullName: '藤原 樹',
    role,
    officeId: 'office-1',
    isActive: true,
  };
}

describe('AlertsController', () => {
  function buildServiceMock(): AlertsService {
    return {
      getDashboard: vi.fn().mockResolvedValue({ counts: {}, alerts: { items: [], total: 0, page: 1, pageSize: 50 } }),
      updateStatus: vi.fn().mockResolvedValue({ id: 'alert-1' }),
      recomputeAll: vi.fn().mockResolvedValue({ clientsProcessed: 1 }),
    } as unknown as AlertsService;
  }

  it('delegates getDashboard() to the service', async () => {
    const service = buildServiceMock();
    const controller = new AlertsController(service);
    const query = { status: 'open' as const };

    await controller.getDashboard(query as any);

    expect(service.getDashboard).toHaveBeenCalledWith(query);
  });

  it('allows an admin to trigger recomputeAll()', async () => {
    const service = buildServiceMock();
    const controller = new AlertsController(service);

    await controller.recomputeAll(buildUser('admin'));

    expect(service.recomputeAll).toHaveBeenCalled();
  });

  it('rejects a non-admin trying to trigger recomputeAll()', async () => {
    const service = buildServiceMock();
    const controller = new AlertsController(service);

    expect(() => controller.recomputeAll(buildUser('sales_rep'))).toThrow(ForbiddenException);
    expect(service.recomputeAll).not.toHaveBeenCalled();
  });
});
