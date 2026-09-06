import { MapController } from './map.controller.js';
import type { MapService } from './map.service.js';

describe('MapController', () => {
  it('delegates getMapClients() to the service with query filters', async () => {
    const service = { getMapClients: vi.fn().mockResolvedValue([]) } as unknown as MapService;
    const controller = new MapController(service);
    const query = { officeId: 'office-1' };

    await controller.getMapClients(query as any);

    expect(service.getMapClients).toHaveBeenCalledWith(query);
  });
});
