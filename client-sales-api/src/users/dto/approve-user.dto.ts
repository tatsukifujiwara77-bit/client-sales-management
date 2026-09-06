import { IsIn, IsOptional, IsUUID } from 'class-validator';
import type { AuthUser } from '../../common/types/authenticated-request.js';

/** 承認待ちユーザーを有効化する際に、管理者がロール・拠点を確定させるためのDTO */
export class ApproveUserDto {
  @IsIn(['admin', 'office_manager', 'sales_rep'])
  role!: AuthUser['role'];

  @IsOptional()
  @IsUUID()
  officeId?: string;
}
