import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addDays, format } from 'date-fns';
import { AppointmentExtraction, ChatHistoryMessage, ExistingAppointmentSummary } from './types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  async extractAppointment(
    message: string,
    history: ChatHistoryMessage[],
    existingAppointments: ExistingAppointmentSummary[] = [],
    now = new Date(),
  ): Promise<AppointmentExtraction> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (apiKey) {
      try {
        return await this.extractWithOpenRouter(apiKey, message, history, existingAppointments, now);
      } catch (error) {
        this.logger.error(`OpenRouter extraction failed: ${(error as Error).message}`);
      }
    }
    return this.extractDeterministically(message, history, existingAppointments, now);
  }

  private async extractWithOpenRouter(
    apiKey: string,
    message: string,
    history: ChatHistoryMessage[],
    existingAppointments: ExistingAppointmentSummary[],
    now: Date,
  ): Promise<AppointmentExtraction> {
    const model = this.config.get<string>('OPENROUTER_MODEL', 'openai/gpt-4o-mini');
    const appointmentContext =
      existingAppointments.length === 0
        ? 'The user currently has no active appointments.'
        : `Active appointments JSON: ${JSON.stringify(existingAppointments)}`;

    const prompt = [
      'Extract appointment booking, update, or cancel intent as strict JSON for a booking API.',
      `Today is ${format(now, 'yyyy-MM-dd')}.`,
      appointmentContext,
      'For booking, require an exact appointment date, startTime, and endTime before returning no missingFields.',
      'Use yyyy-MM-dd dates and HH:mm 24-hour time only. Convert relative dates to exact dates.',
      'Do not invent missing date, start time, or end time.',
      'If the date is in the past, the date is ambiguous, or any time is invalid, ask a clarification question instead of returning a complete booking.',
      'If endTime is not after startTime, ask for a corrected time range.',
      'Do not claim a slot is available, booked, updated, or cancelled; the backend performs those actions.',
      'Return intent as BOOK_APPOINTMENT, UPDATE_APPOINTMENT, CANCEL_APPOINTMENT, or GENERAL_QUERY.',
      'Return appointment keys exactly as title, date, startTime, endTime, description for new or changed values.',
      'For UPDATE_APPOINTMENT, appointment holds only the fields that should change; leave unchanged fields null.',
      'For UPDATE_APPOINTMENT and CANCEL_APPOINTMENT, return targetAppointment keys exactly as title, date, startTime for the existing appointment, and targetAppointmentId when it matches an active appointment id.',
      'If the user does not clearly identify which appointment to update/cancel, set missingFields to include target and ask which appointment by name, date, or time.',
      'For UPDATE_APPOINTMENT, if what should change is unclear, include changedField in missingFields.',
      'Use missingFields values date, startTime, and endTime for incomplete bookings; target and changedField for incomplete updates/cancels.',
      'Never say an appointment is booked, updated, or cancelled in assistantMessage; the backend will say that only after the database change.',
    ].join('\n');

    const priorHistory = history.filter((item, index) => {
      if (index !== history.length - 1) return true;
      return !(item.role === 'USER' && item.content === message);
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          ...priorHistory.slice(-8).map((item) => ({
            role: item.role === 'ASSISTANT' ? 'assistant' : 'user',
            content: item.content,
          })),
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}`);
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter response did not include content');
    }
    return this.normalizeExtraction(JSON.parse(content), existingAppointments);
  }

  normalizeExtraction(
    raw: unknown,
    existingAppointments: ExistingAppointmentSummary[] = [],
  ): AppointmentExtraction {
    const value = this.asRecord(raw);
    const intent = this.normalizeIntent(value.intent);
    const rawAppointment = this.asRecord(value.appointment);
    const rawTarget = this.asRecord(value.targetAppointment ?? value.target ?? value.existingAppointment);
    const date = this.asNullableString(rawAppointment.date);
    const startTime = this.normalizeTime(rawAppointment.startTime ?? rawAppointment.time);
    const durationMinutes = this.asNumber(
      rawAppointment.durationMinutes ?? rawAppointment.duration_minutes ?? rawAppointment.duration,
    );
    const endTime = this.normalizeTime(rawAppointment.endTime) ?? this.addMinutesToTime(startTime, durationMinutes);
    const title =
      this.asNullableString(rawAppointment.title) ??
      this.asNullableString(rawAppointment.purpose) ??
      (intent === 'BOOK_APPOINTMENT' ? 'Appointment' : null);
    const targetAppointment =
      intent === 'UPDATE_APPOINTMENT' || intent === 'CANCEL_APPOINTMENT'
        ? {
            date: this.asNullableString(rawTarget.date),
            startTime: this.normalizeTime(rawTarget.startTime ?? rawTarget.time),
            title: this.asNullableString(rawTarget.title ?? rawTarget.purpose),
          }
        : undefined;
    const targetAppointmentId = this.resolveTargetAppointmentId(
      value.targetAppointmentId ?? value.appointmentId ?? rawTarget.id,
      existingAppointments,
    );
    const appointment =
      intent === 'BOOK_APPOINTMENT' || intent === 'UPDATE_APPOINTMENT'
        ? {
            title: title ?? 'Appointment',
            date,
            startTime,
            endTime,
            description:
              this.asNullableString(rawAppointment.description) ??
              this.asNullableString(rawAppointment.type) ??
              this.asNullableString(rawAppointment.purpose),
          }
        : null;

    const missingFields = this.normalizeMissingFields(
      intent,
      appointment,
      targetAppointment,
      targetAppointmentId,
      existingAppointments.length,
    );
    const clarificationQuestion =
      this.blankToNull(value.clarificationQuestion) ??
      this.defaultClarificationQuestion(intent, missingFields);

    return {
      intent,
      appointment,
      targetAppointmentId,
      targetAppointment,
      missingFields,
      clarificationQuestion,
      assistantMessage: this.blankToNull(value.assistantMessage ?? value.appointmentMessage) ?? clarificationQuestion,
    };
  }

  private extractDeterministically(
    message: string,
    history: ChatHistoryMessage[],
    existingAppointments: ExistingAppointmentSummary[],
    now: Date,
  ): AppointmentExtraction {
    const combined = [...history.slice(-4).map((item) => item.content), message].join(' ');
    const lower = combined.toLowerCase();
    const isCancel = /(cancel|cancelled|call off|delete appointment|remove appointment)/.test(lower);
    const isUpdate = /(reschedule|move|change|edit|update)/.test(lower);
    const isBooking = /(appointment|book|schedule|meet|meeting|consult)/.test(lower);

    if (isCancel) {
      const target = this.extractTargetFromText(lower, now, existingAppointments);
      const missingFields = target.id || target.date || target.startTime || target.title ? [] : ['target'];
      const clarificationQuestion =
        missingFields.length === 0
          ? null
          : 'Which appointment should I cancel? Please share the name, date, or time.';
      return {
        intent: 'CANCEL_APPOINTMENT',
        appointment: null,
        targetAppointmentId: target.id,
        targetAppointment: {
          date: target.date,
          startTime: target.startTime,
          title: target.title,
        },
        missingFields,
        clarificationQuestion,
        assistantMessage: clarificationQuestion,
      };
    }

    if (!isBooking && !isUpdate) {
      return {
        intent: 'GENERAL_QUERY',
        appointment: null,
        missingFields: [],
        clarificationQuestion: null,
        assistantMessage: 'I can help book, update, or cancel appointments. Tell me what you need.',
      };
    }

    const date = this.extractDate(lower, now);
    const times = this.extractTimes(lower);
    const startTime = times[0] ?? null;
    const endTime = times[1] ?? null;
    if (isUpdate) {
      const target = this.extractTargetFromText(lower, now, existingAppointments);
      const changedDate = date && target.date && date !== target.date ? date : date && !target.date ? date : null;
      const changedStart = startTime;
      const hasChange = Boolean(changedDate || changedStart || endTime || this.extractSpecificTitle(lower));
      const hasTarget = Boolean(target.id || target.date || target.startTime || target.title);
      const missingFields = [
        ...(hasTarget || existingAppointments.length === 1 ? [] : ['target']),
        ...(hasChange ? [] : ['changedField']),
      ];
      const clarificationQuestion =
        missingFields.length === 0
          ? null
          : missingFields.includes('target')
            ? 'Which appointment should I update? Please share the name, date, or time.'
            : 'What should I change about the appointment?';

      return {
        intent: 'UPDATE_APPOINTMENT',
        appointment: {
          title: this.extractTitle(lower),
          date: changedDate ?? (hasTarget ? date : null),
          startTime: changedStart,
          endTime,
          description: message,
        },
        targetAppointmentId: target.id,
        targetAppointment: {
          date: target.date ?? (!changedDate ? date : null),
          startTime: target.startTime,
          title: target.title,
        },
        missingFields,
        clarificationQuestion,
        assistantMessage: clarificationQuestion,
      };
    }

    const missingFields = [
      ...(date ? [] : ['date']),
      ...(startTime ? [] : ['startTime']),
      ...(endTime ? [] : ['endTime']),
    ];
    const clarificationQuestion =
      missingFields.length === 0
        ? null
        : missingFields.includes('date')
          ? 'What exact date would you like to book the appointment for?'
          : missingFields.includes('startTime')
            ? 'What start and end time would you prefer for the appointment?'
            : 'What end time should I use for the appointment?';

    return {
      intent: 'BOOK_APPOINTMENT',
      appointment: {
        title: this.extractTitle(lower),
        date,
        startTime,
        endTime,
        description: message,
      },
      missingFields,
      clarificationQuestion,
      assistantMessage: clarificationQuestion,
    };
  }

  private normalizeIntent(rawIntent: unknown): AppointmentExtraction['intent'] {
    const intent = String(rawIntent ?? '').toUpperCase();
    if (intent.includes('CANCEL') || intent.includes('DELETE') || intent.includes('REMOVE')) {
      return 'CANCEL_APPOINTMENT';
    }
    if (intent.includes('UPDATE') || intent.includes('RESCHEDULE') || intent.includes('EDIT') || intent.includes('CHANGE')) {
      return 'UPDATE_APPOINTMENT';
    }
    if (intent.includes('BOOK') || intent.includes('SCHEDULE') || intent.includes('CREATE')) {
      return 'BOOK_APPOINTMENT';
    }
    return 'GENERAL_QUERY';
  }

  private resolveTargetAppointmentId(
    rawId: unknown,
    existingAppointments: ExistingAppointmentSummary[],
  ) {
    const id = this.asNullableString(rawId);
    if (!id) return null;
    return existingAppointments.some((appointment) => appointment.id === id) ? id : null;
  }

  private extractTargetFromText(
    text: string,
    now: Date,
    existingAppointments: ExistingAppointmentSummary[],
  ) {
    const title = this.extractSpecificTitle(text);
    const date = this.extractDate(text, now);
    const startTime = this.extractTimes(text)[0] ?? null;
    const byTitle = title
      ? existingAppointments.filter((appointment) => appointment.title.toLowerCase().includes(title.toLowerCase()))
      : [];
    const byDate = date ? existingAppointments.filter((appointment) => appointment.date === date) : [];
    const matched =
      byTitle.length === 1
        ? byTitle[0]
        : byDate.length === 1
          ? byDate[0]
          : existingAppointments.length === 1
            ? existingAppointments[0]
            : null;

    return {
      id: matched?.id ?? null,
      title: title ?? matched?.title ?? null,
      date: date ?? matched?.date ?? null,
      startTime: startTime ?? null,
    };
  }

  private extractDate(text: string, now: Date) {
    if (text.includes('tomorrow')) {
      return format(addDays(now, 1), 'yyyy-MM-dd');
    }
    if (text.includes('today')) {
      return format(now, 'yyyy-MM-dd');
    }
    const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso) {
      return iso[1];
    }
    return null;
  }

  private extractTimes(text: string) {
    const times: string[] = [];
    const timePattern = /\b(?:(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)|([01]\d|2[0-3]):([0-5]\d))\b/g;
    let match: RegExpExecArray | null;
    while ((match = timePattern.exec(text)) !== null) {
      if (match[4] && match[5]) {
        times.push(`${match[4]}:${match[5]}`);
        continue;
      }

      let hour = Number(match[1]);
      const minutes = match[2] ?? '00';
      const meridiem = match[3];
      if (meridiem === 'pm' && hour !== 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      times.push(`${hour.toString().padStart(2, '0')}:${minutes}`);
    }
    return times;
  }

  private extractTitle(text: string) {
    if (text.includes('dental') || text.includes('dentist')) return 'Dental appointment';
    if (text.includes('doctor') || text.includes('medical')) return 'Medical appointment';
    if (text.includes('consult')) return 'Consultation';
    return 'Appointment';
  }

  private extractSpecificTitle(text: string) {
    const title = this.extractTitle(text);
    return title === 'Appointment' ? null : title;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private asNullableString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private blankToNull(value: unknown) {
    return this.asNullableString(value);
  }

  private asNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : null;
    }
    return null;
  }

  private normalizeTime(value: unknown) {
    const text = this.asNullableString(value);
    if (!text) return null;
    const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    if (!match) return null;
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private addMinutesToTime(startTime: string | null, durationMinutes: number | null) {
    if (!startTime || !durationMinutes) return null;
    const [hours, minutes] = startTime.split(':').map(Number);
    const total = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor((total % 1440) / 60);
    const endMinutes = total % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  private normalizeMissingFields(
    intent: AppointmentExtraction['intent'],
    appointment: AppointmentExtraction['appointment'],
    targetAppointment: AppointmentExtraction['targetAppointment'],
    targetAppointmentId: string | null,
    activeAppointmentCount: number,
  ) {
    if (intent === 'BOOK_APPOINTMENT') {
      return [
        ...(!appointment?.date ? ['date'] : []),
        ...(!appointment?.startTime ? ['startTime'] : []),
        ...(!appointment?.endTime ? ['endTime'] : []),
      ];
    }

    if (intent === 'UPDATE_APPOINTMENT') {
      const hasTarget = Boolean(
        targetAppointmentId ||
          targetAppointment?.date ||
          targetAppointment?.startTime ||
          targetAppointment?.title ||
          activeAppointmentCount === 1,
      );
      const hasChange = Boolean(
        appointment?.date ||
          appointment?.startTime ||
          appointment?.endTime ||
          (appointment?.title && appointment.title !== 'Appointment'),
      );
      return [...(hasTarget ? [] : ['target']), ...(hasChange ? [] : ['changedField'])];
    }

    if (intent === 'CANCEL_APPOINTMENT') {
      const hasTarget = Boolean(
        targetAppointmentId ||
          targetAppointment?.date ||
          targetAppointment?.startTime ||
          targetAppointment?.title ||
          activeAppointmentCount === 1,
      );
      return hasTarget ? [] : ['target'];
    }

    return [];
  }

  private defaultClarificationQuestion(
    intent: AppointmentExtraction['intent'],
    missingFields: string[],
  ) {
    if (missingFields.length === 0) return null;
    if (intent === 'UPDATE_APPOINTMENT') {
      if (missingFields.includes('target')) {
        return 'Which appointment should I update? Please share the name, date, or time.';
      }
      if (missingFields.includes('changedField')) {
        return 'What should I change about the appointment?';
      }
    }
    if (intent === 'CANCEL_APPOINTMENT' && missingFields.includes('target')) {
      return 'Which appointment should I cancel? Please share the name, date, or time.';
    }
    if (missingFields.includes('date')) {
      return 'What exact date would you like to book the appointment for?';
    }
    if (missingFields.includes('startTime')) {
      return 'What start and end time would you prefer for the appointment?';
    }
    if (missingFields.includes('endTime')) {
      return 'What end time should I use for the appointment?';
    }
    return null;
  }
}
