import { BadRequestException } from '@nestjs/common';
import { ClientNoteAttachmentsController } from './client-note-attachments.controller.js';
import type { ClientNoteAttachmentsService } from './client-note-attachments.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
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

describe('ClientNoteAttachmentsController', () => {
  function buildServiceMock(): ClientNoteAttachmentsService {
    return {
      list: vi.fn().mockResolvedValue([]),
      upload: vi.fn().mockResolvedValue({ id: 'attachment-1' }),
      getDownloadUrl: vi.fn().mockResolvedValue('https://signed.example/file'),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as ClientNoteAttachmentsService;
  }

  it('delegates list() with clientId and noteId', async () => {
    const service = buildServiceMock();
    const controller = new ClientNoteAttachmentsController(service);

    await controller.list('client-1', 'note-1');

    expect(service.list).toHaveBeenCalledWith('client-1', 'note-1');
  });

  it('delegates upload() with the file and current user, fixing latin1-mangled filenames', async () => {
    const service = buildServiceMock();
    const controller = new ClientNoteAttachmentsController(service);
    const mangledFile = buildFile({ originalname: Buffer.from('提案資料.pdf', 'utf8').toString('latin1') });

    await controller.upload('client-1', 'note-1', mangledFile, currentUser);

    expect(service.upload).toHaveBeenCalledWith('client-1', 'note-1', expect.objectContaining({
      originalname: '提案資料.pdf',
    }), currentUser);
  });

  it('throws BadRequestException from upload() when no file was provided', async () => {
    const service = buildServiceMock();
    const controller = new ClientNoteAttachmentsController(service);

    await expect(controller.upload('client-1', 'note-1', undefined, currentUser)).rejects.toThrow(
      BadRequestException,
    );
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('delegates getDownloadUrl() and wraps the result in { url }', async () => {
    const service = buildServiceMock();
    const controller = new ClientNoteAttachmentsController(service);

    const result = await controller.getDownloadUrl('client-1', 'note-1', 'attachment-1');

    expect(service.getDownloadUrl).toHaveBeenCalledWith('client-1', 'note-1', 'attachment-1');
    expect(result).toEqual({ url: 'https://signed.example/file' });
  });

  it('delegates remove() with clientId, noteId and attachmentId', async () => {
    const service = buildServiceMock();
    const controller = new ClientNoteAttachmentsController(service);

    await controller.remove('client-1', 'note-1', 'attachment-1');

    expect(service.remove).toHaveBeenCalledWith('client-1', 'note-1', 'attachment-1');
  });
});
