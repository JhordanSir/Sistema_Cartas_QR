import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class UpdateExtractedProductDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @IsString()
  @Matches(/^\d{1,8}(?:\.\d{1,2})?$/, {
    message: 'basePrice must be a valid amount with at most two decimals',
  })
  basePrice!: string;
}
