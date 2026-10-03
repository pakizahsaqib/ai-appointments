import { ChatSession } from '../chat/chat-session.entity';
import { User } from '../users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppointmentStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'chat_session_id', type: 'uuid', nullable: true })
  chatSessionId: string | null;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.Confirmed })
  status: AppointmentStatus;

  @ManyToOne(() => User, (user) => user.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ChatSession, (session) => session.appointments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
