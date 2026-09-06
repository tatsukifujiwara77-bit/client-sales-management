import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/** POST /clients/:id/assignments （担当営業の割当） */
export class AssignClientDto {
  @IsUUID()
  userId!: string;

  /** true にすると、そのクライアントのメイン担当になる（既存のメイン担当からは自動的に外れる） */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
