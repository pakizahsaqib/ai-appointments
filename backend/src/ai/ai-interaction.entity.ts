import { ChatSession } from '../chat/chat-session.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ai_interactions')
export class AiInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'chat_session_id', type: 'uuid', nullable: true })
  chatSessionId: string | null;

  @Column({ length: 120 })
  model: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ name: 'latency_ms', default: 0 })
  latencyMs: number;

  @Column({ name: 'token_usage', type: 'jsonb', nullable: true })
  tokenUsage: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @ManyToOne(() => ChatSession, (session) => session.aiInteractions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
