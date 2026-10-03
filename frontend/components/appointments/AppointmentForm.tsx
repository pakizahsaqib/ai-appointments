'use client';

import { FormEvent, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { api } from '@/lib/api/client';
import { AppointmentFieldErrors, findOverlappingAppointment, formatOverlapMessage, validateAppointmentFields } from '@/lib/appointments/validation';
import type { Appointment } from '@/types';
import { todayKey } from './calendarUtils';

type Props = {
  sessionId?: string;
  appointments: Appointment[];
  onCreated?: (appointment: Appointment) => void;
};

export function AppointmentForm({ sessionId, appointments, onCreated }: Props) {
  const [title, setTitle] = useState('Appointment');
  const [appointmentDate, setAppointmentDate] = useState(todayKey());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AppointmentFieldErrors>({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timeConflictError = fieldErrors.startTime?.startsWith('That slot is not available.') ? fieldErrors.startTime : '';
  const startTimeError = timeConflictError ? '' : fieldErrors.startTime;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('');
    const values = { title, appointmentDate, startTime, endTime: endTime || null };
    const nextFieldErrors = validateAppointmentFields(values, todayKey());
    const overlap = Object.keys(nextFieldErrors).length === 0 ? findOverlappingAppointment(values, appointments) : null;
    if (overlap) {
      nextFieldErrors.startTime = formatOverlapMessage(overlap);
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;
    setLoading(true);
    try {
      const appointment = await api.createAppointment({
        title: title.trim(),
        appointmentDate,
        startTime,
        endTime: endTime || undefined,
        description: description || undefined,
        chatSessionId: sessionId,
      });
      setStatus('Appointment created.');
      onCreated?.(appointment);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(field: keyof AppointmentFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <h2>Complete with form</h2>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</div> : null}
      {status ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-900">{status}</div> : null}
      <div className="grid gap-2">
        <label className="text-[13px] font-bold text-slate-700" htmlFor="title">Title</label>
        <input className="min-h-11 rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" id="title" value={title} onChange={(event) => {
          setTitle(event.target.value);
          clearFieldError('title');
        }} aria-invalid={Boolean(fieldErrors.title)} />
        {fieldErrors.title ? <small className="field-error">{fieldErrors.title}</small> : null}
      </div>
      <div className="grid gap-2">
        <label className="text-[13px] font-bold text-slate-700" htmlFor="appointmentDate">Date</label>
        <input className="min-h-11 rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" id="appointmentDate" type="date" min={todayKey()} value={appointmentDate} onChange={(event) => {
          setAppointmentDate(event.target.value);
          clearFieldError('appointmentDate');
        }} aria-invalid={Boolean(fieldErrors.appointmentDate)} />
        {fieldErrors.appointmentDate ? <small className="field-error">{fieldErrors.appointmentDate}</small> : null}
      </div>
      <div className="form-row grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-[13px] font-bold text-slate-700" htmlFor="startTime">Start time</label>
          <input className="min-h-11 rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" id="startTime" type="time" value={startTime} onChange={(event) => {
            const value = event.target.value;
            setStartTime(value);
            if (endTime && value >= endTime) setEndTime('');
            clearFieldError('startTime');
            clearFieldError('endTime');
          }} aria-invalid={Boolean(startTimeError || timeConflictError)} aria-describedby={timeConflictError ? 'time-conflict-error' : startTimeError ? 'start-time-error' : undefined} />
          {startTimeError ? <small id="start-time-error" className="field-error">{startTimeError}</small> : null}
        </div>
        <div className="grid gap-2">
          <label className="text-[13px] font-bold text-slate-700" htmlFor="endTime">End time</label>
          <input className="min-h-11 rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" id="endTime" type="time" min={startTime || undefined} value={endTime} onChange={(event) => {
            setEndTime(event.target.value);
            clearFieldError('endTime');
            clearFieldError('startTime');
          }} aria-invalid={Boolean(fieldErrors.endTime || timeConflictError)} aria-describedby={timeConflictError ? 'time-conflict-error' : fieldErrors.endTime ? 'end-time-error' : undefined} />
          {fieldErrors.endTime ? <small id="end-time-error" className="field-error">{fieldErrors.endTime}</small> : null}
        </div>
        {timeConflictError ? <small id="time-conflict-error" className="time-conflict-error">{timeConflictError}</small> : null}
      </div>
      <div className="grid gap-2">
        <label className="text-[13px] font-bold text-slate-700" htmlFor="description">Notes</label>
        <textarea className="rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" id="description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-100 px-3.5 py-2.5 font-extrabold text-blue-900 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
        <CalendarPlus size={18} />
        {loading ? 'Creating...' : 'Create appointment'}
      </button>
    </form>
  );
}
