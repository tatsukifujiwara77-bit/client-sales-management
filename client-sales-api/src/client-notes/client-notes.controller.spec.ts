import { ClientNotesController } from './client-notes.controller.js';
import type { ClientNotesService } from './client-notes.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ClientNotesController', () => {
  function buildServiceMock(): ClientNotesService {
    return {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'note-1' }),
      update: vi.fn().mockResolvedValue({ id: 'note-1' }),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as ClientNotesService;
  }

  it('delegates create() with clientId, dto and current user', async () => {
    const service = buildServiceMock();
    const controller = new ClientNotesController(service);
    const dto = { content: '毎年春に定期訪問を希望される' };

    await controller.create('client-1', dto as any, currentUser);

    expect(service.create).toHaveBeenCalledWith('client-1', dto, currentUser);
  });

  it('delegates update()/remove() with clientId and noteId', async () => {
    const service = buildServiceMock();
    const controller = new ClientNotesController(service);

    await controller.update('client-1', 'note-1', { content: '更新後' } as any, currentUser);
    expect(service.update).toHaveBeenCalledWith('client-1', 'note-1', { content: '更新後' }, currentUser);

    await controller.remove('client-1', 'note-1');
    expect(service.remove).toHaveBeenCalledWith('client-1', 'note-1');
  });
});
