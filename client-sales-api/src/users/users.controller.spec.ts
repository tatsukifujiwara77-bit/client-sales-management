import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    fullName: '藤原 樹',
    role: 'admin',
    officeId: null,
    isActive: true,
    ...overrides,
  };
}

describe('UsersController', () => {
  function buildServiceMock(): UsersService {
    return {
      getMe: vi.fn().mockResolvedValue({ id: 'user-1' }),
      list: vi.fn().mockResolvedValue([]),
      listPending: vi.fn().mockResolvedValue([]),
      approve: vi.fn().mockResolvedValue({ id: 'user-2' }),
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
    const user = buildUser();

    await controller.getMe(user);

    expect(service.getMe).toHaveBeenCalledWith(user);
  });

  it('delegates listPending() to the service when called by an admin', async () => {
    const service = buildServiceMock();
    const controller = new UsersController(service);

    await controller.listPending(buildUser({ role: 'admin' }));

    expect(service.listPending).toHaveBeenCalled();
  });

  it('rejects listPending() for a non-admin', async () => {
    const service = buildServiceMock();
    const controller = new UsersController(service);

    expect(() => controller.listPending(buildUser({ role: 'sales_rep' }))).toThrow(ForbiddenException);
    expect(service.listPending).not.toHaveBeenCalled();
  });

  it('delegates approve() to the service when called by an admin', async () => {
    const service = buildServiceMock();
    const controller = new UsersController(service);
    const dto = { role: 'sales_rep' as const, officeId: 'office-1' };

    await controller.approve('user-2', dto, buildUser({ role: 'admin' }));

    expect(service.approve).toHaveBeenCalledWith('user-2', dto);
  });

  it('rejects approve() for a non-admin', async () => {
    const service = buildServiceMock();
    const controller = new UsersController(service);

    expect(() =>
      controller.approve('user-2', { role: 'sales_rep' }, buildUser({ role: 'office_manager' })),
    ).toThrow(ForbiddenException);
    expect(service.approve).not.toHaveBeenCalled();
  });
});
