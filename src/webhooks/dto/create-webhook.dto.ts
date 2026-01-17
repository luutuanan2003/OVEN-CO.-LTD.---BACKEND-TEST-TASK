import {
  IsString,
  IsNotEmpty,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  source!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  event!: string;

  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, unknown>;
}
