import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

export enum ChatMessageRole {
  User = 'USER',
  Assistant = 'ASSISTANT',
  System = 'SYSTEM',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'chat_session_id' })
  chatSessionId: string;

  @Column({ type: 'enum', enum: ChatMessageRole })
  role: ChatMessageRole;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => ChatSession, (session) => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
