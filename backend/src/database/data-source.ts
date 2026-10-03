import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AiInteraction } from '../ai/ai-interaction.entity';
import { Appointment } from '../appointments/appointment.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { ChatSession } from '../chat/chat-session.entity';
import { User } from '../users/user.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'ai_appointments',
  entities: [User, Appointment, ChatSession, ChatMessage, AiInteraction],
  migrations: ['dist/database/migrations/*.js'],
});
