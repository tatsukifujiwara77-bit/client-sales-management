import { ClientContactsController } from './client-contacts.controller.js';
import type { ClientContactsService } from './client-contacts.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ClientContactsController', () => {
  function buildServiceMock(): ClientContactsService {
    return {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'contact-1' }),
      update: vi.fn().mockResolvedValue({ id: 'contact-1' }),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as ClientContactsService;
  }

  it('delegates create() with clientId, dto and current user', async () => {
    const service = buildServiceMock();
    const controller = new ClientContactsController(service);
    const dto = { name: '髙江洲様', isKeyPerson: true };

    await controller.create('client-1', dto as any, currentUser);

    expect(service.create).toHaveBeenCalledWith('client-1', dto, currentUser);
  });

  it('delegates remove() with clientId and contactId', async () => {
    const service = buildServiceMock();
    const controller = new ClientContactsController(service);

    await controller.remove('client-1', 'contact-1');

    expect(service.remove).toHaveBeenCalledWith('client-1', 'contact-1');
  });
});
