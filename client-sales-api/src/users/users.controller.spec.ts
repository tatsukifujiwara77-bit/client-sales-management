import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

describe('UsersController', () => {
  function buildServiceMock(): UsersService {
    return {
      getMe: vi.fn().mockResolvedValue({ id: 'user-1' }),
      list: vi.fn().mockResolvedValue([]),
    } as unknown as UsersService;
  }

  it('delegates list() to the service', async () => {
    const service = buildServiceMock();
    const controller = new UsersController(service);

    await controller.list();

    expect(service.list).toHaveBeenCalled();
  });

  it('delegates getMe() to the service with the current user', async () => {
    const service = buildServiceMock();
    const controller = new UsersController(service);
    const user: AuthUser = {
      id: 'user-1',
      email: 'user@example.com',
      fullName: '藤原 樹',
      role: 'admin',
      officeId: null,
      isActive: true,
    };

    await controller.getMe(user);

    expect(service.getMe).toHaveBeenCalledWith(user);
  });
});
