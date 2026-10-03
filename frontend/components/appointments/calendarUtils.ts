import { type CSSProperties } from 'react';
import { appointmentStatusPillClass } from '@/lib/appointments/statusColors';
import type { Appointment } from '@/types';

export const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const firstHour = 0;
export const lastHour = 23;
export const slotHeight = 32;
export const timeSlots = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
export const appointmentStatuses: Appointment['status'][] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
export const appointmentTimeOptions = Array.from({ length: 24 * 4 }, (_, index) => {
  const minutes = index * 15;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export type AppointmentFormValues = {
  title: string;
  description?: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string | null;
  status: Appointment['status'];
};

export function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(date.getDate() - date.getDay());
  return start;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatWeekRange(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  return `${first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function formatDisplayDate(date: string) {
  return parseDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatAgendaMonth(date: string) {
  return parseDate(date).toLocaleDateString(undefined, { month: 'short' });
}

export function formatAgendaDay(date: string) {
  return parseDate(date).toLocaleDateString(undefined, { day: 'numeric' });
}

export function formatControlDate(date: string) {
  return parseDate(date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatControlTime(time: string) {
  if (!time) return 'No end time';
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function normalizeTime(time: string | null | undefined) {
  return time?.slice(0, 5) ?? '';
}

export function appointmentColor(appointment: Appointment) {
  const text = `${appointment.title} ${appointment.description ?? ''}`.toLowerCase();
  if (text.includes('dental') || text.includes('dentist') || text.includes('root')) return 'cyan';
  if (text.includes('consult') || text.includes('meet')) return 'blue';
  if (text.includes('doctor') || text.includes('medical')) return 'navy';
  return 'ice';
}

export function colorClasses(color: string) {
  if (color === 'cyan') return 'border-sky-200 bg-sky-100';
  if (color === 'blue') return 'border-blue-200 bg-blue-50';
  if (color === 'navy') return 'border-indigo-200 bg-indigo-50';
  return 'border-slate-200 bg-slate-50';
}

export function statusClasses(status: Appointment['status']) {
  return appointmentStatusPillClass(status);
}

export function minutesFromStart(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return (hour - firstHour) * 60 + minute;
}

export function eventStyle(appointment: Appointment) {
  const start = Math.max(0, minutesFromStart(appointment.startTime));
  const end = appointment.endTime ? Math.max(start + 30, minutesFromStart(appointment.endTime)) : start + 60;
  const top = (start / 60) * slotHeight;
  const height = Math.max(44, ((end - start) / 60) * slotHeight - 8);

  return {
    '--event-top': `${top}px`,
    '--event-height': `${height}px`,
  } as CSSProperties;
}

export function sortAppointments(items: Appointment[]) {
  return [...items].sort((first, second) => {
    return `${first.appointmentDate}T${first.startTime}`.localeCompare(`${second.appointmentDate}T${second.startTime}`);
  });
}

export function monthCells(monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function validateAppointmentForm(values: AppointmentFormValues) {
  if (values.appointmentDate < todayKey()) return 'Appointment date cannot be in the past.';
  if (values.endTime && values.startTime >= values.endTime) return 'End time must be after start time.';
  return '';
}
