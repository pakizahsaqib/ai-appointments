import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInteraction } from './ai-interaction.entity';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiInteraction])],
  providers: [AiService],
  exports: [AiService, TypeOrmModule],
})
export class AiModule {}
