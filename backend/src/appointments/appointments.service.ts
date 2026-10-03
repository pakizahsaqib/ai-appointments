import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto';

@Injectable()
export class AppointmentsService {
  constructor(@InjectRepository(Appointment) private readonly appointments: Repository<Appointment>) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    validateAppointmentSchedule(dto.appointmentDate, dto.startTime, dto.endTime ?? null);
    await this.validateAvailableSlot(userId, dto.appointmentDate, dto.startTime, dto.endTime ?? null);

    return this.appointments.save(
      this.appointments.create({
        userId,
        title: dto.title,
        description: dto.description ?? null,
        appointmentDate: dto.appointmentDate,
        startTime: dto.startTime,
        endTime: dto.endTime ?? null,
        chatSessionId: dto.chatSessionId ?? null,
        status: dto.status ?? AppointmentStatus.Confirmed,
      }),
    );
  }

  findAll(userId: string) {
    return this.appointments.find({
      where: { userId },
      order: { appointmentDate: 'ASC', startTime: 'ASC' },
    });
  }

  async findOne(userId: string, id: string) {
    const appointment = await this.appointments.findOne({ where: { id, userId } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.findOne(userId, id);
    const nextAppointmentDate = dto.appointmentDate ?? appointment.appointmentDate;
    const nextStartTime = dto.startTime ?? appointment.startTime;
    const nextEndTime = dto.endTime !== undefined ? dto.endTime : appointment.endTime;

    validateAppointmentSchedule(nextAppointmentDate, nextStartTime, nextEndTime);
    await this.validateAvailableSlot(userId, nextAppointmentDate, nextStartTime, nextEndTime, appointment.id);

    Object.assign(appointment, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.appointmentDate !== undefined ? { appointmentDate: dto.appointmentDate } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    return this.appointments.save(appointment);
  }

  private async validateAvailableSlot(
    userId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string | null | undefined,
    excludeId?: string,
  ) {
    const existingAppointments = await this.findAll(userId);
    const requestedStart = timeToMinutes(startTime);
    const requestedEnd = timeToMinutes(endTime ?? addMinutes(startTime, 60));
    const overlap = existingAppointments.find((appointment) => {
      if (appointment.id === excludeId) return false;
      if (appointment.status === AppointmentStatus.Cancelled) return false;
      if (appointment.appointmentDate !== appointmentDate) return false;
      const existingStart = timeToMinutes(appointment.startTime);
      const existingEnd = timeToMinutes(appointment.endTime ?? addMinutes(appointment.startTime, 60));
      return requestedStart < existingEnd && requestedEnd > existingStart;
    });

    if (overlap) {
      const overlapEnd = overlap.endTime?.slice(0, 5) ?? addMinutes(overlap.startTime, 60);
      throw new BadRequestException(
        `That slot is not available. It overlaps with "${overlap.title}" on ${overlap.appointmentDate} from ${overlap.startTime.slice(0, 5)} to ${overlapEnd}.`,
      );
    }
  }
}

function validateAppointmentSchedule(appointmentDate: string, startTime: string, endTime?: string | null) {
  validateDateKey(appointmentDate);
  validateTimeKey(startTime, 'Start time');
  if (endTime) validateTimeKey(endTime, 'End time');

  if (appointmentDate < todayKey()) {
    throw new BadRequestException('Appointment date cannot be in the past');
  }

  if (endTime && startTime >= endTime) {
    throw new BadRequestException('End time must be after start time');
  }
}

function validateDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new BadRequestException('Appointment date must be a valid yyyy-MM-dd date');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException('Appointment date must be a valid yyyy-MM-dd date');
  }
}

function validateTimeKey(value: string, label: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new BadRequestException(`${label} must be a valid HH:mm time`);
  }
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function addMinutes(time: string, minutesToAdd: number) {
  const next = timeToMinutes(time) + minutesToAdd;
  const hour = Math.floor(next / 60);
  const minute = next % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
