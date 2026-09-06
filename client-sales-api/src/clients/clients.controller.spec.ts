import { ClientsController } from './clients.controller.js';
import type { ClientsService } from './clients.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ClientsController', () => {
  function buildServiceMock(): ClientsService {
    return {
      list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
      findOne: vi.fn().mockResolvedValue({ id: 'client-1' }),
      create: vi.fn().mockResolvedValue({ id: 'client-1' }),
      update: vi.fn().mockResolvedValue({ id: 'client-1' }),
      listAssignments: vi.fn().mockResolvedValue([]),
      assign: vi.fn().mockResolvedValue([]),
      unassign: vi.fn().mockResolvedValue(undefined),
      getPipeline: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as ClientsService;
  }

  it('delegates remove() with id', async () => {
    const service = buildServiceMock();
    const controller = new ClientsController(service);

    await controller.remove('client-1');

    expect(service.remove).toHaveBeenCalledWith('client-1');
  });

  it('delegates getPipeline() to the service with query filters', async () => {
    const service = buildServiceMock();
    const controller = new ClientsController(service);
    const query = { officeId: 'office-1' };

    await controller.getPipeline(query as any);

    expect(service.getPipeline).toHaveBeenCalledWith(query);
  });

  it('delegates create() to the service with the current user', async () => {
    const service = buildServiceMock();
    const controller = new ClientsController(service);
    const dto = { companyName: '株式会社ABC', officeId: 'office-1', salesStageId: 'stage-1' };

    await controller.create(dto as any, currentUser);

    expect(service.create).toHaveBeenCalledWith(dto, currentUser);
  });

  it('delegates update() to the service with id, dto and current user', async () => {
    const service = buildServiceMock();
    const controller = new ClientsController(service);

    await controller.update('client-1', { companyName: '新社名' } as any, currentUser);

    expect(service.update).toHaveBeenCalledWith('client-1', { companyName: '新社名' }, currentUser);
  });

  it('delegates assign()/unassign() to the service', async () => {
    const service = buildServiceMock();
    const controller = new ClientsController(service);

    await controller.assign('client-1', { userId: 'user-2', isPrimary: true });
    expect(service.assign).toHaveBeenCalledWith('client-1', { userId: 'user-2', isPrimary: true });

    await controller.unassign('client-1', 'user-2');
    expect(service.unassign).toHaveBeenCalledWith('client-1', 'user-2');
  });
});
