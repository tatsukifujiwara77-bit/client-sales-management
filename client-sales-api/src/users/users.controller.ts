import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
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
}
