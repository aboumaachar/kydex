import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class OfacSyncDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsIn(['manual', 'scheduled', 'startup'])
  mode?: 'manual' | 'scheduled' | 'startup';
}
