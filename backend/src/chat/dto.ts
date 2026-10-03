import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
