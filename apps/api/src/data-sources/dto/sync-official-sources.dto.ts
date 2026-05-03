import { IsArray, IsOptional, IsString } from 'class-validator';

export class SyncOfficialSourcesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];
}
