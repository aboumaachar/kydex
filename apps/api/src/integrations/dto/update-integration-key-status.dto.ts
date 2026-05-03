import { IsIn, IsString } from 'class-validator';

export class UpdateIntegrationKeyStatusDto {
  @IsString()
  @IsIn(['ACTIVE', 'DISABLED', 'REVOKED'])
  status!: 'ACTIVE' | 'DISABLED' | 'REVOKED';
}