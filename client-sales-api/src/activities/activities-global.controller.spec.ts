import { ActivitiesGlobalController } from './activities-global.controller.js';
import type { ActivitiesService } from './activities.service.js';

describe('ActivitiesGlobalController', () => {
  it('delegates list() to activitiesService.listAcrossClients() with the query', async () => {
    const service = {
      listAcrossClients: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    } as unknown as ActivitiesService;
    const controller = new ActivitiesGlobalController(service);
    const query = { activityType: 'visit' as const };

    await controller.list(query as any);

    expect(service.listAcrossClients).toHaveBeenCalledWith(query);
  });
});
