import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientNoteAttachmentsService } from './client-note-attachments.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'eq', 'order', 'insert', 'delete', 'maybeSingle', 'single'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

interface StorageMockOptions {
  uploadError?: { message: string } | null;
  removeError?: { message: string } | null;
  signedUrlResult?: { data: { signedUrl: string } | null; error: { message: string } | null };
}

function createStorageMock(options: StorageMockOptions = {}) {
  return {
    upload: vi.fn().mockResolvedValue({ error: options.uploadError ?? null }),
    remove: vi.fn().mockResolvedValue({ error: options.removeError ?? null }),
    createSignedUrl: vi
      .fn()
      .mockResolvedValue(options.signedUrlResult ?? { data: { signedUrl: 'https://signed.example/file' }, error: null }),
  };
}

function buildSupabaseRequestServiceMock(
  tableBuilders: Record<string, unknown>,
  storage: ReturnType<typeof createStorageMock>,
): SupabaseRequestService {
  return {
    getClient: () => ({
      from: (table: string) => tableBuilders[table],
      storage: { from: () => storage },
    }),
  } as unknown as SupabaseRequestService;
}

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

const rawAttachmentRow = {
  id: 'attachment-1',
  note_id: 'note-1',
  client_id: 'client-1',
  storage_path: 'client-1/note-1/uuid-file.pdf',
  file_name: '提案資料.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1234,
  created_at: '2026-05-01T00:00:00Z',
  created_by: 'user-1',
};

function buildFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: '提案資料.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1234,
    buffer: Buffer.from('dummy'),
    ...overrides,
  } as Express.Multer.File;
}

describe('ClientNoteAttachmentsService', () => {
  it('lists attachments mapped from raw rows', async () => {
    const storage = createStorageMock();
    const notesBuilder = createBuilderMock({ data: [rawAttachmentRow], error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_note_attachments: notesBuilder }, storage),
    );

    const result = await service.list('client-1', 'note-1');
    expect(result).toEqual([
      {
        id: 'attachment-1',
        noteId: 'note-1',
        clientId: 'client-1',
        fileName: '提案資料.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1234,
        createdAt: '2026-05-01T00:00:00Z',
        createdBy: 'user-1',
      },
    ]);
  });

  it('uploads a file and stores its metadata when the note exists', async () => {
    const storage = createStorageMock();
    const clientNotesBuilder = createBuilderMock({ data: { id: 'note-1' }, error: null });
    const attachmentsBuilder = createBuilderMock({ data: rawAttachmentRow, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock(
        { client_notes: clientNotesBuilder, client_note_attachments: attachmentsBuilder },
        storage,
      ),
    );

    const result = await service.upload('client-1', 'note-1', buildFile(), currentUser);

    expect(storage.upload).toHaveBeenCalledWith(expect.stringContaining('client-1/note-1/'), expect.any(Buffer), {
      contentType: 'application/pdf',
      upsert: false,
    });
    expect(result).toMatchObject({ id: 'attachment-1', fileName: '提案資料.pdf' });
  });

  it('throws NotFoundException when uploading to a note that does not exist/is not accessible', async () => {
    const storage = createStorageMock();
    const clientNotesBuilder = createBuilderMock({ data: null, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_notes: clientNotesBuilder }, storage),
    );

    await expect(service.upload('client-1', 'missing', buildFile(), currentUser)).rejects.toThrow(NotFoundException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the storage upload itself fails', async () => {
    const storage = createStorageMock({ uploadError: { message: 'boom' } });
    const clientNotesBuilder = createBuilderMock({ data: { id: 'note-1' }, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_notes: clientNotesBuilder }, storage),
    );

    await expect(service.upload('client-1', 'note-1', buildFile(), currentUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns a signed download URL for an existing attachment', async () => {
    const storage = createStorageMock({
      signedUrlResult: { data: { signedUrl: 'https://signed.example/file' }, error: null },
    });
    const builder = createBuilderMock({ data: { storage_path: rawAttachmentRow.storage_path }, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_note_attachments: builder }, storage),
    );

    const url = await service.getDownloadUrl('client-1', 'note-1', 'attachment-1');
    expect(url).toBe('https://signed.example/file');
    expect(storage.createSignedUrl).toHaveBeenCalledWith(rawAttachmentRow.storage_path, 300);
  });

  it('throws NotFoundException when the attachment to download does not exist', async () => {
    const storage = createStorageMock();
    const builder = createBuilderMock({ data: null, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_note_attachments: builder }, storage),
    );

    await expect(service.getDownloadUrl('client-1', 'note-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('deletes the metadata row then removes the underlying storage object', async () => {
    const storage = createStorageMock();
    const builder = createBuilderMock({ data: { storage_path: rawAttachmentRow.storage_path }, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_note_attachments: builder }, storage),
    );

    await service.remove('client-1', 'note-1', 'attachment-1');
    expect(storage.remove).toHaveBeenCalledWith([rawAttachmentRow.storage_path]);
  });

  it('throws NotFoundException when removing an attachment that does not exist', async () => {
    const storage = createStorageMock();
    const builder = createBuilderMock({ data: null, error: null });
    const service = new ClientNoteAttachmentsService(
      buildSupabaseRequestServiceMock({ client_note_attachments: builder }, storage),
    );

    await expect(service.remove('client-1', 'note-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});
