import { ActionItemsController } from './action-items.controller.js';
import type { ActionItemsService } from './action-items.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ActionItemsController', () => {
  function buildServiceMock(): ActionItemsService {
    return {
      list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
      findOne: vi.fn().mockResolvedValue({ id: 'action-1' }),
      create: vi.fn().mockResolvedValue({ id: 'action-1' }),
      update: vi.fn().mockResolvedValue({ id: 'action-1' }),
      complete: vi.fn().mockResolvedValue({ actionItem: { id: 'action-1' }, activity: null, nextActionItem: null }),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as ActionItemsService;
  }

  it('delegates create() with clientId, dto and current user', async () => {
    const service = buildServiceMock();
    const controller = new ActionItemsController(service);
    const dto = { content: '提案資料のご説明', dueDate: '2026-05-21' };

    await controller.create('client-1', dto as any, currentUser);

    expect(service.create).toHaveBeenCalledWith('client-1', dto, currentUser);
  });

  it('delegates complete() with clientId, actionItemId, dto and current user', async () => {
    const service = buildServiceMock();
    const controller = new ActionItemsController(service);
    const dto = { activity: { activityType: 'meeting', activityDate: '2026-05-20' } };

    await controller.complete('client-1', 'action-1', dto as any, currentUser);

    expect(service.complete).toHaveBeenCalledWith('client-1', 'action-1', dto, currentUser);
  });

  it('delegates update()/remove() with clientId and actionItemId', async () => {
    const service = buildServiceMock();
    const controller = new ActionItemsController(service);

    await controller.update('client-1', 'action-1', { status: 'cancelled' } as any, currentUser);
    expect(service.update).toHaveBeenCalledWith('client-1', 'action-1', { status: 'cancelled' }, currentUser);

    await controller.remove('client-1', 'action-1');
    expect(service.remove).toHaveBeenCalledWith('client-1', 'action-1');
  });
});
