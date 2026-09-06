import { UsersService } from './users.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'eq', 'order', 'maybeSingle', 'update', 'single'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

describe('UsersService', () => {
  it('returns the user profile with office info when office_id is set', async () => {
    const builder = createBuilderMock({ data: { id: 'office-1', name: '九州営業部' }, error: null });
    const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
    const service = new UsersService(supabaseRequestService);

    const user: AuthUser = {
      id: 'user-1',
      email: 'user@example.com',
      fullName: '藤原 樹',
      role: 'admin',
      officeId: 'office-1',
      isActive: true,
    };

    const result = await service.getMe(user);
    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      fullName: '藤原 樹',
      role: 'admin',
      office: { id: 'office-1', name: '九州営業部' },
    });
  });

  it('returns office: null when the user has no office assigned', async () => {
    const supabaseRequestService = { getClient: () => ({ from: () => ({}) }) } as unknown as SupabaseRequestService;
    const service = new UsersService(supabaseRequestService);

    const user: AuthUser = {
      id: 'user-2',
      email: null,
      fullName: '佐藤 花子',
      role: 'sales_rep',
      officeId: null,
      isActive: true,
    };

    const result = await service.getMe(user);
    expect(result.office).toBeNull();
  });

  it('lists active users mapped to a simple summary', async () => {
    const builder = createBuilderMock({
      data: [{ id: 'user-1', full_name: '藤原 樹', role: 'admin', office_id: 'office-1', is_active: true }],
      error: null,
    });
    const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
    const service = new UsersService(supabaseRequestService);

    const result = await service.list();
    expect(result).toEqual([
      { id: 'user-1', fullName: '藤原 樹', role: 'admin', officeId: 'office-1', isActive: true },
    ]);
  });

  it('lists pending (is_active=false) users mapped to a summary with createdAt', async () => {
    const builder = createBuilderMock({
      data: [
        {
          id: 'user-2',
          full_name: '佐藤 花子',
          role: 'sales_rep',
          office_id: null,
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
    const service = new UsersService(supabaseRequestService);

    const result = await service.listPending();
    expect(result).toEqual([
      {
        id: 'user-2',
        fullName: '佐藤 花子',
        role: 'sales_rep',
        officeId: null,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
  });

  it('approves a pending user by setting role/office and is_active=true', async () => {
    const builder = createBuilderMock({
      data: { id: 'user-2', full_name: '佐藤 花子', role: 'sales_rep', office_id: 'office-1', is_active: true },
      error: null,
    });
    const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
    const service = new UsersService(supabaseRequestService);

    const result = await service.approve('user-2', { role: 'sales_rep', officeId: 'office-1' });
    expect(result).toEqual({
      id: 'user-2',
      fullName: '佐藤 花子',
      role: 'sales_rep',
      officeId: 'office-1',
      isActive: true,
    });
  });
});
