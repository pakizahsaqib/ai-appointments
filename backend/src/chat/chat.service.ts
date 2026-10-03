import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiInteraction } from '../ai/ai-interaction.entity';
import { AiService } from '../ai/ai.service';
import { AppointmentExtraction, ExistingAppointmentSummary } from '../ai/types';
import { Appointment, AppointmentStatus } from '../appointments/appointment.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { ChatMessage, ChatMessageRole } from './chat-message.entity';
import { ChatSession } from './chat-session.entity';
import { CreateChatSessionDto, SendMessageDto } from './dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession) private readonly sessions: Repository<ChatSession>,
    @InjectRepository(ChatMessage) private readonly messages: Repository<ChatMessage>,
    @InjectRepository(AiInteraction) private readonly interactions: Repository<AiInteraction>,
    private readonly ai: AiService,
    private readonly appointments: AppointmentsService,
  ) {}

  createSession(userId: string, dto: CreateChatSessionDto) {
    return this.sessions.save(this.sessions.create({ userId, title: dto.title ?? 'Appointment chat' }));
  }

  findSessions(userId: string) {
    return this.sessions.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async findMessages(userId: string, sessionId: string) {
    await this.getOwnedSession(userId, sessionId);
    return this.messages.find({ where: { chatSessionId: sessionId }, order: { createdAt: 'ASC' } });
  }

  findAllMessages(userId: string) {
    return this.messages
      .createQueryBuilder('message')
      .innerJoin('message.chatSession', 'session')
      .where('session.userId = :userId', { userId })
      .orderBy('message.createdAt', 'ASC')
      .addOrderBy('message.id', 'ASC')
      .getMany();
  }

  async sendMessage(userId: string, sessionId: string, dto: SendMessageDto) {
    const session = await this.getOwnedSession(userId, sessionId);
    const userMessage = await this.messages.save(
      this.messages.create({ chatSessionId: session.id, role: ChatMessageRole.User, content: dto.content }),
    );
    const history = await this.messages.find({
      where: { chatSessionId: session.id },
      order: { createdAt: 'ASC' },
      take: 20,
    });
    const existingAppointments = await this.appointments.findAll(userId);
    const activeAppointments = existingAppointments.filter(
      (appointment) => appointment.status !== AppointmentStatus.Cancelled,
    );
    const appointmentSummaries = this.toAppointmentSummaries(activeAppointments);

    const started = Date.now();
    let extraction: AppointmentExtraction;
    let error: string | null = null;
    try {
      extraction = await this.ai.extractAppointment(
        dto.content,
        history.map((message) => ({ role: message.role, content: message.content })),
        appointmentSummaries,
      );
    } catch (caught) {
      error = (caught as Error).message;
      extraction = {
        intent: 'GENERAL_QUERY',
        appointment: null,
        missingFields: [],
        clarificationQuestion: null,
        assistantMessage: 'I had trouble reading that request. Please try again or use the appointment form.',
      };
    }

    let appointment = null;
    let assistantContent = extraction.assistantMessage ?? 'How can I help with your appointment?';
    this.logger.log(
      `AI extraction for session=${session.id}: intent=${extraction.intent}, missingFields=${JSON.stringify(
        extraction.missingFields,
      )}, target=${JSON.stringify({
        id: extraction.targetAppointmentId ?? null,
        title: extraction.targetAppointment?.title ?? null,
        date: extraction.targetAppointment?.date ?? null,
        startTime: extraction.targetAppointment?.startTime ?? null,
      })}, appointment=${JSON.stringify({
        title: extraction.appointment?.title ?? null,
        date: extraction.appointment?.date ?? null,
        startTime: extraction.appointment?.startTime ?? null,
        endTime: extraction.appointment?.endTime ?? null,
      })}`,
    );

    if (extraction.intent === 'BOOK_APPOINTMENT' && extraction.appointment) {
      if (
        extraction.missingFields.length === 0 &&
        extraction.appointment.date &&
        extraction.appointment.startTime &&
        extraction.appointment.endTime
      ) {
        try {
          appointment = await this.appointments.create(userId, {
            title: extraction.appointment.title,
            description: extraction.appointment.description ?? undefined,
            appointmentDate: extraction.appointment.date,
            startTime: extraction.appointment.startTime,
            endTime: extraction.appointment.endTime ?? undefined,
            chatSessionId: session.id,
          });
          this.logger.log(
            `Appointment created from chat session=${session.id}: appointmentId=${appointment.id}, date=${appointment.appointmentDate}, startTime=${appointment.startTime}, endTime=${appointment.endTime ?? 'null'}`,
          );
          assistantContent = `Your ${appointment.title.toLowerCase()} has been booked for ${appointment.appointmentDate} at ${appointment.startTime.slice(0, 5)}.`;
        } catch (caught) {
          if (!(caught instanceof BadRequestException)) throw caught;
          assistantContent = (caught.getResponse() as { message?: string }).message ?? caught.message;
        }
      } else if (extraction.clarificationQuestion) {
        this.logger.warn(
          `Appointment not created for session=${session.id}: missingFields=${JSON.stringify(
            extraction.missingFields,
          )}, clarification="${extraction.clarificationQuestion}"`,
        );
        assistantContent = extraction.clarificationQuestion;
      } else {
        this.logger.warn(
          `Appointment not created for session=${session.id}: date=${extraction.appointment.date ?? 'null'}, startTime=${extraction.appointment.startTime ?? 'null'}, missingFields=${JSON.stringify(extraction.missingFields)}`,
        );
      }
    } else if (extraction.intent === 'UPDATE_APPOINTMENT') {
      if (extraction.missingFields.includes('target')) {
        assistantContent = this.askWhichAppointment(activeAppointments, 'update');
      } else if (extraction.missingFields.includes('changedField')) {
        assistantContent = extraction.clarificationQuestion ?? 'What should I change about the appointment?';
      } else {
        const candidates = this.findTargetCandidates(activeAppointments, extraction);
        if (candidates.length === 0) {
          assistantContent = this.askWhichAppointment(activeAppointments, 'update');
        } else if (candidates.length > 1) {
          assistantContent = this.askWhichAppointment(candidates, 'update');
        } else {
          const update = this.toUpdateDto(extraction);
          if (Object.keys(update).length === 0) {
            assistantContent = 'What should I change about the appointment?';
          } else {
            try {
              appointment = await this.appointments.update(userId, candidates[0].id, update);
              assistantContent = `Your ${appointment.title.toLowerCase()} has been updated to ${appointment.appointmentDate} at ${appointment.startTime.slice(0, 5)}.`;
            } catch (caught) {
              if (!(caught instanceof BadRequestException)) throw caught;
              assistantContent = (caught.getResponse() as { message?: string }).message ?? caught.message;
            }
          }
        }
      }
    } else if (extraction.intent === 'CANCEL_APPOINTMENT') {
      if (extraction.missingFields.includes('target')) {
        assistantContent = this.askWhichAppointment(activeAppointments, 'cancel');
      } else {
        const candidates = this.findTargetCandidates(activeAppointments, extraction);
        if (candidates.length === 0) {
          assistantContent = this.askWhichAppointment(activeAppointments, 'cancel');
        } else if (candidates.length > 1) {
          assistantContent = this.askWhichAppointment(candidates, 'cancel');
        } else {
          try {
            appointment = await this.appointments.update(userId, candidates[0].id, {
              status: AppointmentStatus.Cancelled,
            });
            assistantContent = `Your ${appointment.title.toLowerCase()} on ${appointment.appointmentDate} at ${appointment.startTime.slice(0, 5)} has been cancelled.`;
          } catch (caught) {
            if (!(caught instanceof BadRequestException)) throw caught;
            assistantContent = (caught.getResponse() as { message?: string }).message ?? caught.message;
          }
        }
      }
    } else {
      this.logger.log(`No appointment mutation attempted for session=${session.id}: intent=${extraction.intent}`);
    }

    const assistantMessage = await this.messages.save(
      this.messages.create({ chatSessionId: session.id, role: ChatMessageRole.Assistant, content: assistantContent }),
    );
    await this.sessions.update(session.id, { updatedAt: new Date() });
    await this.interactions.save(
      this.interactions.create({
        chatSessionId: session.id,
        model: process.env.OPENROUTER_MODEL ?? 'deterministic-fallback',
        prompt: dto.content,
        response: JSON.stringify(extraction),
        latencyMs: Date.now() - started,
        tokenUsage: null,
        error,
      }),
    );

    return { userMessage, assistantMessage, appointment, extraction };
  }

  private async getOwnedSession(userId: string, id: string) {
    const session = await this.sessions.findOne({ where: { id, userId } });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  private toAppointmentSummaries(appointments: Appointment[]): ExistingAppointmentSummary[] {
    return appointments.map((appointment) => ({
      id: appointment.id,
      title: appointment.title,
      date: appointment.appointmentDate,
      startTime: appointment.startTime.slice(0, 5),
      endTime: appointment.endTime ? appointment.endTime.slice(0, 5) : null,
      status: appointment.status,
    }));
  }

  private findTargetCandidates(appointments: Appointment[], extraction: AppointmentExtraction) {
    if (extraction.targetAppointmentId) {
      return appointments.filter((appointment) => appointment.id === extraction.targetAppointmentId);
    }

    const target = extraction.targetAppointment;
    const hasFilter = Boolean(target?.date || target?.startTime || target?.title);
    if (!hasFilter) {
      return appointments;
    }

    return appointments.filter((appointment) => {
      if (target?.date && appointment.appointmentDate !== target.date) return false;
      if (target?.startTime && appointment.startTime.slice(0, 5) !== target.startTime) return false;
      if (target?.title && !appointment.title.toLowerCase().includes(target.title.toLowerCase())) return false;
      return true;
    });
  }

  private askWhichAppointment(appointments: Appointment[], action: 'update' | 'cancel') {
    if (appointments.length === 0) {
      return `You have no active appointments to ${action}.`;
    }

    const preview = appointments
      .slice(0, 5)
      .map(
        (appointment) =>
          `"${appointment.title}" on ${appointment.appointmentDate} at ${appointment.startTime.slice(0, 5)}`,
      )
      .join('; ');
    const more = appointments.length > 5 ? `, and ${appointments.length - 5} more` : '';
    return `Which appointment should I ${action}? Reply with the name, date, or time. Your appointments: ${preview}${more}.`;
  }

  private toUpdateDto(extraction: AppointmentExtraction) {
    const appointment = extraction.appointment;
    if (!appointment) return {};
    return {
      ...(appointment.title && appointment.title !== 'Appointment' ? { title: appointment.title } : {}),
      ...(appointment.date ? { appointmentDate: appointment.date } : {}),
      ...(appointment.startTime ? { startTime: appointment.startTime } : {}),
      ...(appointment.endTime ? { endTime: appointment.endTime } : {}),
    };
  }
}
