import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInteraction } from '../ai/ai-interaction.entity';
import { AiModule } from '../ai/ai.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ChatController } from './chat.controller';
import { ChatMessage } from './chat-message.entity';
import { ChatSession } from './chat-session.entity';
import { ChatService } from './chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage, AiInteraction]), AiModule, AppointmentsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
