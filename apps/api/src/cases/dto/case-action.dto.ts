import { IsOptional, IsString } from 'class-validator';

export class CaseActionDto {
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
