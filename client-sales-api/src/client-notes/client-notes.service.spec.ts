import { NotFoundException } from '@nestjs/common';
import { ClientNotesService } from './client-notes.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { ClientActivityCacheService } from '../common/client-activity-cache/client-activity-cache.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

function buildStubClientActivityCacheService(): ClientActivityCacheService {
  return { refresh: vi.fn().mockResolvedValue(undefined) } as unknown as ClientActivityCacheService;
}

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

describe('ClientNotesService', () => {
  it('creates a note tagged with the current user', async () => {
    const rawRow = {
      id: 'note-1',
      client_id: 'client-1',
      meeting_type: 'visit',
      participants_own: '藤原',
      participants_client: '髙江洲様',
      content: '毎年春に定期訪問を希望される',
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1',
    };
    const builder = createBuilderMock({ data: rawRow, error: null });
    const service = new ClientNotesService(buildSupabaseRequestServiceMock(builder), buildStubClientActivityCacheService());

    const result = await service.create(
      'client-1',
      {
        meetingType: 'visit',
        participantsOwn: '藤原',
        participantsClient: '髙江洲様',
        content: '毎年春に定期訪問を希望される',
      },
      currentUser,
    );
    expect(result).toMatchObject({
      id: 'note-1',
      meetingType: 'visit',
      participantsOwn: '藤原',
      participantsClient: '髙江洲様',
      content: '毎年春に定期訪問を希望される',
      createdBy: 'user-1',
    });
  });

  it('returns null from findLatest when there are no notes yet', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new ClientNotesService(buildSupabaseRequestServiceMock(builder), buildStubClientActivityCacheService());

    await expect(service.findLatest('client-1')).resolves.toBeNull();
  });

  it('throws NotFoundException when updating a note that does not exist/is not accessible', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new ClientNotesService(buildSupabaseRequestServiceMock(builder), buildStubClientActivityCacheService());

    await expect(service.update('client-1', 'missing', { content: '更新' }, currentUser)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates meetingType and participants fields', async () => {
    const rawRow = {
      id: 'note-1',
      client_id: 'client-1',
      meeting_type: 'online',
      participants_own: '藤原',
      participants_client: '田中様',
      content: '更新後',
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-02T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1',
    };
    const builder = createBuilderMock({ data: rawRow, error: null });
    const service = new ClientNotesService(buildSupabaseRequestServiceMock(builder), buildStubClientActivityCacheService());

    const result = await service.update(
      'client-1',
      'note-1',
      { meetingType: 'online', participantsOwn: '藤原', participantsClient: '田中様', content: '更新後' },
      currentUser,
    );
    expect(result).toMatchObject({ meetingType: 'online', participantsOwn: '藤原', participantsClient: '田中様' });
  });
});
