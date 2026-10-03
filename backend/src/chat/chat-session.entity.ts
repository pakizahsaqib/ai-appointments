import { AiInteraction } from '../ai/ai-interaction.entity';
import { Appointment } from '../appointments/appointment.entity';
import { User } from '../users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title: string | null;

  @ManyToOne(() => User, (user) => user.chatSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ChatMessage, (message) => message.chatSession)
  messages: ChatMessage[];

  @OneToMany(() => Appointment, (appointment) => appointment.chatSession)
  appointments: Appointment[];

  @OneToMany(() => AiInteraction, (interaction) => interaction.chatSession)
  aiInteractions: AiInteraction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
