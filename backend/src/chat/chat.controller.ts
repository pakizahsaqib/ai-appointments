import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatSessionDto, SendMessageDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('messages')
  allMessages(@Req() request: Request) {
    return this.chat.findAllMessages(request.user!.id);
  }

  @Post('sessions')
  create(@Req() request: Request, @Body() dto: CreateChatSessionDto) {
    return this.chat.createSession(request.user!.id, dto);
  }

  @Get('sessions')
  list(@Req() request: Request) {
    return this.chat.findSessions(request.user!.id);
  }

  @Get('sessions/:id/messages')
  messages(@Req() request: Request, @Param('id') id: string) {
    return this.chat.findMessages(request.user!.id, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('sessions/:id/messages')
  send(@Req() request: Request, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(request.user!.id, id, dto);
  }
}
