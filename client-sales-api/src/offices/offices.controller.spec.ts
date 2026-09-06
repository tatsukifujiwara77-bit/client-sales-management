import { OfficesController } from './offices.controller.js';
import type { OfficesService } from './offices.service.js';

describe('OfficesController', () => {
  it('delegates list() to the service', async () => {
    const service = { list: vi.fn().mockResolvedValue([]) } as unknown as OfficesService;
    const controller = new OfficesController(service);

    await controller.list();

    expect(service.list).toHaveBeenCalled();
  });
});
