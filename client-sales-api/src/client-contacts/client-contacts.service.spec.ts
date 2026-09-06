import { NotFoundException } from '@nestjs/common';
import { ClientContactsService } from './client-contacts.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'maybeSingle', 'single'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

function buildSupabaseRequestServiceMock(builder: unknown): SupabaseRequestService {
  return { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
}

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ClientContactsService', () => {
  it('lists and maps contacts', async () => {
    const rawRow = {
      id: 'contact-1',
      client_id: 'client-1',
      name: '髙江洲様',
      position: '部長',
      department: '人事部',
      phone: null,
      email: null,
      is_key_person: true,
      notes: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    };
    const builder = createBuilderMock({ data: [rawRow], error: null });
    const service = new ClientContactsService(buildSupabaseRequestServiceMock(builder));

    const result = await service.list('client-1');
    expect(result).toEqual([
      expect.objectContaining({ id: 'contact-1', name: '髙江洲様', isKeyPerson: true }),
    ]);
  });

  it('throws NotFoundException when updating a contact that does not exist/is not accessible', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new ClientContactsService(buildSupabaseRequestServiceMock(builder));

    await expect(
      service.update('client-1', 'missing', { name: '新しい名前' }, currentUser),
    ).rejects.toThrow(NotFoundException);
  });
});
