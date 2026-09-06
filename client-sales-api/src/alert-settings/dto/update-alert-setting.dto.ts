import { IsNotEmpty, IsString } from 'class-validator';

/** PATCH /alert-settings/:key （書き込みはRLSでadmin限定） */
export class UpdateAlertSettingDto {
  @IsString()
  @IsNotEmpty()
  value!: string;
}
