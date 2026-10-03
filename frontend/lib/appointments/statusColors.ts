import type { Appointment } from '../../types';

export function appointmentStatusClass(status: Appointment['status']) {
  return status.toLowerCase();
}

export function appointmentStatusDisplayName(status: Appointment['status']) {
  return status === 'PENDING' ? 'DRAFT' : status;
}

export function appointmentStatusPillClass(status: Appointment['status']) {
  if (status === 'CONFIRMED') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'PENDING') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export function calendarStatusEventClass(status: Appointment['status']) {
  if (status === 'CONFIRMED') return 'border-blue-200 bg-blue-50';
  if (status === 'CANCELLED') return 'border-rose-200 bg-rose-50';
  if (status === 'PENDING') return 'border-amber-200 bg-amber-50';
  return 'border-emerald-200 bg-emerald-50';
}
