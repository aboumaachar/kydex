import { DataSourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateDataSourceDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(DataSourceType)
  type!: DataSourceType;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  versionLabel?: string;
}
