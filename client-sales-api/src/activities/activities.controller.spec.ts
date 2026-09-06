import { ActivitiesController } from './activities.controller.js';
import type { ActivitiesService } from './activities.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ActivitiesController', () => {
  function buildServiceMock(): ActivitiesService {
    return {
      list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
      findOne: vi.fn().mockResolvedValue({ id: 'activity-1' }),
      create: vi.fn().mockResolvedValue({ id: 'activity-1' }),
      update: vi.fn().mockResolvedValue({ id: 'activity-1' }),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as ActivitiesService;
  }

  it('delegates create() with clientId, dto and current user', async () => {
    const service = buildServiceMock();
    const controller = new ActivitiesController(service);
    const dto = { activityType: 'visit', activityDate: '2026-05-20' };

    await controller.create('client-1', dto as any, currentUser);

    expect(service.create).toHaveBeenCalledWith('client-1', dto, currentUser);
  });

  it('delegates list() with clientId and query', async () => {
    const service = buildServiceMock();
    const controller = new ActivitiesController(service);
    const query = { activityType: 'meeting' as const };

    await controller.list('client-1', query as any);

    expect(service.list).toHaveBeenCalledWith('client-1', query);
  });

  it('delegates update()/remove() with clientId and activityId', async () => {
    const service = buildServiceMock();
    const controller = new ActivitiesController(service);

    await controller.update('client-1', 'activity-1', { notes: '更新後' } as any, currentUser);
    expect(service.update).toHaveBeenCalledWith('client-1', 'activity-1', { notes: '更新後' }, currentUser);

    await controller.remove('client-1', 'activity-1');
    expect(service.remove).toHaveBeenCalledWith('client-1', 'activity-1');
  });
});
