import { AlertSettingsController } from './alert-settings.controller.js';
import type { AlertSettingsService } from './alert-settings.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'admin@example.com',
  fullName: '藤原 樹',
  role: 'admin',
  officeId: null,
  isActive: true,
};

describe('AlertSettingsController', () => {
  it('delegates update() with key, value and current user', async () => {
    const service = { update: vi.fn().mockResolvedValue({ key: 'no_visit_threshold_days', value: '60' }) } as unknown as AlertSettingsService;
    const controller = new AlertSettingsController(service);

    await controller.update('no_visit_threshold_days', { value: '60' }, currentUser);

    expect(service.update).toHaveBeenCalledWith('no_visit_threshold_days', '60', currentUser);
  });
});
