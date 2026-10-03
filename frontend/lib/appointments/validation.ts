import type { Appointment } from '../../types';

export type AppointmentFieldErrors = Partial<Record<'title' | 'appointmentDate' | 'startTime' | 'endTime', string>>;

export type AppointmentValidationValues = {
  title: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string | null;
};

export function validateAppointmentFields(values: AppointmentValidationValues, today: string): AppointmentFieldErrors {
  const errors: AppointmentFieldErrors = {};

  if (!values.title.trim()) errors.title = 'Title is required.';
  if (!values.appointmentDate) {
    errors.appointmentDate = 'Date is required.';
  } else if (values.appointmentDate < today) {
    errors.appointmentDate = 'Appointment date cannot be in the past.';
  }
  if (!values.startTime) errors.startTime = 'Start time is required.';
  if (!values.endTime) {
    errors.endTime = 'End time is required.';
  } else if (values.startTime && values.startTime >= values.endTime) {
    errors.endTime = 'End time must be after start time.';
  }

  return errors;
}

export function findOverlappingAppointment(
  values: AppointmentValidationValues,
  appointments: Appointment[],
  excludeId?: string,
) {
  const start = timeToMinutes(values.startTime);
  const end = timeToMinutes(values.endTime || addMinutes(values.startTime, 60));
  if (start === null || end === null) return null;

  return appointments.find((appointment) => {
    if (appointment.id === excludeId) return false;
    if (String(appointment.status).toUpperCase() === 'CANCELLED') return false;
    if (appointment.appointmentDate !== values.appointmentDate) return false;
    const existingStart = timeToMinutes(appointment.startTime);
    const existingEnd = timeToMinutes(appointment.endTime || addMinutes(appointment.startTime, 60));
    if (existingStart === null || existingEnd === null) return false;
    return start < existingEnd && end > existingStart;
  }) ?? null;
}

export function formatOverlapMessage(appointment: Appointment) {
  const end = appointment.endTime?.slice(0, 5) ?? addMinutes(appointment.startTime, 60);
  return `That slot is not available. It overlaps with "${appointment.title}" on ${appointment.appointmentDate} from ${appointment.startTime.slice(0, 5)} to ${end}.`;
}

function timeToMinutes(time: string | null | undefined) {
  if (!time) return null;
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addMinutes(time: string, minutesToAdd: number) {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const next = minutes + minutesToAdd;
  const hour = Math.floor(next / 60);
  const minute = next % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
