import { SalesStagesController } from './sales-stages.controller.js';
import type { SalesStagesService } from './sales-stages.service.js';

describe('SalesStagesController', () => {
  it('delegates update() with id and dto', async () => {
    const service = { update: vi.fn().mockResolvedValue({ id: 'stage-1' }) } as unknown as SalesStagesService;
    const controller = new SalesStagesController(service);

    await controller.update('stage-1', { sortOrder: 2 });

    expect(service.update).toHaveBeenCalledWith('stage-1', { sortOrder: 2 });
  });
});
