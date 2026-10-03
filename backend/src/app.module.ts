import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiInteraction } from './ai/ai-interaction.entity';
import { AiModule } from './ai/ai.module';
import { Appointment } from './appointments/appointment.entity';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { ChatMessage } from './chat/chat-message.entity';
import { ChatSession } from './chat/chat-session.entity';
import { ChatModule } from './chat/chat.module';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 40 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(config.get<string>('DATABASE_PORT', '5432')),
        username: config.get<string>('DATABASE_USER', 'pakizahsaqib'),
        password: config.get<string>('DATABASE_PASSWORD', '1234'),
        database: config.get<string>('DATABASE_NAME', 'ai_appointments'),
        entities: [User, Appointment, ChatSession, ChatMessage, AiInteraction],
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    AppointmentsModule,
    AiModule,
    ChatModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
