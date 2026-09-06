import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApproveUserDto } from './dto/approve-user.dto.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** ログイン中のユーザー自身の情報（ヘッダー/サイドバー表示用） */
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user);
  }

  /** 社内ユーザーの簡易一覧（クライアント一覧の「担当者」フィルタ等で使用） */
  @Get('users')
  list() {
    return this.usersService.list();
  }

  /**
   * 承認待ち（is_active=false）のユーザー一覧（設定画面「ユーザー承認」タブ）。
   * RLSでは判定できない一覧系操作のため、ここで明示的にロールチェックを行う
   * （alerts.controller.ts の recompute と同じ方針）。
   */
  @Get('users/pending')
  listPending(@CurrentUser() user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view pending users.');
    }
    return this.usersService.listPending();
  }

  /** 承認待ちユーザーを有効化する（ロール・拠点を確定させた上でis_active=trueに） */
  @Patch('users/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveUserDto, @CurrentUser() user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can approve users.');
    }
    return this.usersService.approve(id, dto);
  }

  /** 承認待ちユーザーを却下する（is_active=falseの行のみ削除対象） */
  @Delete('users/:id')
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can reject users.');
    }
    return this.usersService.reject(id);
  }
}
