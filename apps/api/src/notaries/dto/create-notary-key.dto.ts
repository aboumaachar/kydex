import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNotaryKeyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @IsNotEmpty()
  notarySlug!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
