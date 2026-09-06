import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  ClientNoteAttachmentsService,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './client-note-attachments.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('clients/:clientId/notes/:noteId/attachments')
export class ClientNoteAttachmentsController {
  constructor(private readonly clientNoteAttachmentsService: ClientNoteAttachmentsService) {}

  @Get()
  list(@Param('clientId', ParseUUIDPipe) clientId: string, @Param('noteId', ParseUUIDPipe) noteId: string) {
    return this.clientNoteAttachmentsService.list(clientId, noteId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('このファイル形式はアップロードできません。'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('添付するファイルを選択してください。');
    }
    // ブラウザによってはoriginalnameがlatin1として送られてくることがあるため、UTF-8として復元する
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.clientNoteAttachmentsService.upload(clientId, noteId, file, user);
  }

  @Get(':attachmentId/download')
  async getDownloadUrl(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    const url = await this.clientNoteAttachmentsService.getDownloadUrl(clientId, noteId, attachmentId);
    return { url };
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.clientNoteAttachmentsService.remove(clientId, noteId, attachmentId);
  }
}
