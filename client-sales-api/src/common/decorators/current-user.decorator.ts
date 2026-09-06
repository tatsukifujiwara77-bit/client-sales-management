import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser, AuthenticatedRequest } from '../types/authenticated-request.js';

/**
 * SupabaseAuthGuard が req.user にセットしたログインユーザー(profiles)を取得する。
 * 使用例: findAll(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
