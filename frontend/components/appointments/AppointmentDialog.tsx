'use client';

import { type FormEvent, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { appointmentStatusDisplayName } from '@/lib/appointments/statusColors';
import { AppointmentFieldErrors, findOverlappingAppointment, formatOverlapMessage, validateAppointmentFields } from '@/lib/appointments/validation';
import type { Appointment } from '@/types';
import {
  appointmentStatuses,
  appointmentTimeOptions,
  dayLabels,
  formatControlDate,
  formatControlTime,
  formatMonth,
  monthCells,
  normalizeTime,
  parseDate,
  todayKey,
  toDateKey,
  type AppointmentFormValues,
} from './calendarUtils';

type Props = {
  appointment?: Appointment;
  appointments: Appointment[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: AppointmentFormValues) => void;
};

const fieldClass = 'field grid gap-2';
const labelClass = 'text-[13px] font-bold text-slate-700';
const triggerClass = 'custom-picker-trigger flex min-h-[50px] w-full items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3.5 py-2 text-base font-medium text-slate-900 shadow-none transition hover:border-blue-200 hover:bg-sky-50 focus-visible:border-blue-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10';
const menuClass = 'absolute left-0 top-[calc(100%+8px)] z-[90] rounded-lg border border-blue-100 bg-white/[0.98] shadow-[0_20px_46px_rgba(30,58,138,0.14)]';

export function AppointmentDialog({ appointment, appointments, saving, onClose, onSave }: Props) {
  const [title, setTitle] = useState(appointment?.title ?? 'Appointment');
  const [description, setDescription] = useState(appointment?.description ?? '');
  const [appointmentDate, setAppointmentDate] = useState(appointment?.appointmentDate ?? todayKey());
  const [startTime, setStartTime] = useState(normalizeTime(appointment?.startTime ?? '09:00'));
  const [endTime, setEndTime] = useState(normalizeTime(appointment?.endTime));
  const [status, setStatus] = useState<Appointment['status']>(appointment?.status ?? 'CONFIRMED');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AppointmentFieldErrors>({});
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [openPicker, setOpenPicker] = useState<'date' | 'start' | 'end' | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(appointment?.appointmentDate ?? todayKey()));
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const minDate = todayKey();
  const dateCells = monthCells(visibleMonth);
  const timeConflictError = fieldErrors.startTime?.startsWith('That slot is not available.') ? fieldErrors.startTime : '';
  const startTimeError = timeConflictError ? '' : fieldErrors.startTime;

  function submit(event: FormEvent) {
    event.preventDefault();
    const values = {
      title,
      description: description || undefined,
      appointmentDate,
      startTime,
      endTime: endTime || null,
      status,
    };
    const nextFieldErrors = validateAppointmentFields(values, todayKey());
    const overlap = Object.keys(nextFieldErrors).length === 0
      ? findOverlappingAppointment(values, appointments, appointment?.id)
      : null;
    if (overlap) {
      nextFieldErrors.startTime = formatOverlapMessage(overlap);
    }
    setFieldErrors(nextFieldErrors);
    setFormError('');
    if (Object.keys(nextFieldErrors).length > 0) return;
    onSave(values);
  }

  function clearFieldError(field: keyof AppointmentFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError('');
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-4 backdrop-blur" role="presentation" onMouseDown={onClose}>
      <section className="edit-appointment-modal max-h-[calc(100vh-36px)] w-full max-w-[520px] overflow-y-auto rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_45px_rgba(30,58,138,0.08)]" role="dialog" aria-modal="true" aria-labelledby="edit-appointment-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-appointment-title" className="m-0 text-[22px] font-bold text-slate-900">{appointment ? 'Appointment details' : 'Add appointment'}</h2>
            <p className="mt-1.5 text-sm leading-snug text-slate-500">{appointment ? 'Review or update the calendar details for this appointment.' : 'Manually add an appointment to the weekly calendar.'}</p>
          </div>
          <button className="icon-button grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white p-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700" type="button" aria-label="Close edit appointment" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form className="edit-appointment-form grid gap-3.5" onSubmit={submit}>
          {formError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="edit-title">Title</label>
            <input
              className="min-h-11 rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              id="edit-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                clearFieldError('title');
              }}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? 'edit-title-error' : undefined}
            />
            {fieldErrors.title ? <small id="edit-title-error" className="field-error">{fieldErrors.title}</small> : null}
          </div>
          <div className={fieldClass}>
            <span id="edit-date-label" className={labelClass}>Date</span>
            <div className="custom-picker relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpenPicker(null)}>
              <button className={triggerClass} type="button" aria-haspopup="dialog" aria-expanded={openPicker === 'date'} aria-labelledby="edit-date-label" aria-invalid={Boolean(fieldErrors.appointmentDate)} onClick={() => setOpenPicker((current) => (current === 'date' ? null : 'date'))}>
                <span>{formatControlDate(appointmentDate)}</span>
                <CalendarDays size={18} aria-hidden="true" />
              </button>
              {openPicker === 'date' ? (
                <div className={`date-picker-popover ${menuClass} w-72 p-3`} role="dialog" aria-label="Choose appointment date">
                  <div className="date-picker-header mb-2.5 flex items-center justify-between gap-2.5">
                    <strong className="text-[13px] text-slate-900">{formatMonth(visibleMonth)}</strong>
                    <div className="flex gap-1">
                      <button className="min-h-8 rounded-lg bg-transparent px-2 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-800" type="button" aria-label="Previous month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                        <ChevronLeft size={16} />
                      </button>
                      <button className="min-h-8 rounded-lg bg-transparent px-2 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-800" type="button" aria-label="Next month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="date-picker-weekdays mb-1 grid grid-cols-7">
                    {dayLabels.map((day) => <span className="grid min-h-7 place-items-center text-[11px] font-extrabold text-slate-500" key={day}>{day.slice(0, 1)}</span>)}
                  </div>
                  <div className="date-picker-grid grid grid-cols-7">
                    {dateCells.map((day) => {
                      const dayKey = toDateKey(day);
                      const selected = dayKey === appointmentDate;
                      const outside = day.getMonth() !== visibleMonth.getMonth();
                      const disabled = dayKey < minDate;
                      return (
                        <button
                          key={dayKey}
                          className={`${selected ? 'selected bg-blue-100 text-blue-800' : 'bg-transparent text-slate-900 hover:bg-blue-100 hover:text-blue-800'} ${outside ? 'outside text-slate-400' : ''} ${dayKey === minDate ? 'today ring-1 ring-blue-200' : ''} ${disabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-slate-400' : ''}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setAppointmentDate(dayKey);
                            setVisibleMonth(day);
                            setOpenPicker(null);
                            clearFieldError('appointmentDate');
                          }}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button className="min-h-8 rounded-lg bg-transparent px-2 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-800" type="button" onClick={() => {
                      const now = new Date();
                      setAppointmentDate(toDateKey(now));
                      setVisibleMonth(now);
                      setOpenPicker(null);
                      clearFieldError('appointmentDate');
                    }}>Today</button>
                  </div>
                </div>
              ) : null}
            </div>
            {fieldErrors.appointmentDate ? <small id="edit-date-error" className="field-error">{fieldErrors.appointmentDate}</small> : null}
          </div>
          <div className="form-row grid gap-3 sm:grid-cols-2">
            <TimePicker label="Start time" labelId="edit-start-time-label" open={openPicker === 'start'} value={startTime} error={startTimeError} conflictError={timeConflictError} onToggle={() => setOpenPicker((current) => (current === 'start' ? null : 'start'))} onClose={() => setOpenPicker(null)} onSelect={(value) => {
              setStartTime(value);
              if (endTime && value >= endTime) setEndTime('');
              clearFieldError('startTime');
              clearFieldError('endTime');
            }} />
            <TimePicker label="End time" labelId="edit-end-time-label" open={openPicker === 'end'} value={endTime} error={fieldErrors.endTime} conflictError={timeConflictError} minTime={startTime} onToggle={() => setOpenPicker((current) => (current === 'end' ? null : 'end'))} onClose={() => setOpenPicker(null)} onSelect={(value) => {
              setEndTime(value);
              clearFieldError('endTime');
              clearFieldError('startTime');
            }} />
            {timeConflictError ? <small id="edit-time-conflict-error" className="time-conflict-error">{timeConflictError}</small> : null}
          </div>
          <div className={fieldClass}>
            <span id="edit-status-label" className={labelClass}>Status</span>
            <div className="custom-picker relative" ref={statusMenuRef} onBlur={(event) => !statusMenuRef.current?.contains(event.relatedTarget) && setStatusMenuOpen(false)}>
              <button className={triggerClass} type="button" aria-haspopup="listbox" aria-expanded={statusMenuOpen} aria-labelledby="edit-status-label" onClick={() => setStatusMenuOpen((open) => !open)}>
                <span>{appointmentStatusDisplayName(status)}</span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              {statusMenuOpen ? (
                <div className={`time-picker-popover ${menuClass} right-0 z-[80] grid gap-1 p-1.5`} role="listbox" aria-labelledby="edit-status-label" tabIndex={-1}>
                  {appointmentStatuses.map((option) => (
                    <button key={option} className={`flex min-h-10 w-full items-center justify-between gap-2.5 rounded-lg bg-transparent px-2.5 py-1.5 text-slate-900 hover:bg-blue-100 hover:text-blue-800 ${option === status ? 'bg-blue-100 text-blue-800' : ''}`} type="button" role="option" aria-selected={option === status} onClick={() => {
                      setStatus(option);
                      setStatusMenuOpen(false);
                    }}>
                      <span>{appointmentStatusDisplayName(option)}</span>
                      {option === status ? <Check size={16} aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="edit-description">Notes</label>
            <textarea className="rounded-lg border border-blue-100 px-3 py-2 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" id="edit-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2.5 pt-1">
            <button className="rounded-lg bg-slate-100 px-3.5 py-2.5 font-extrabold text-blue-900 hover:bg-blue-100" type="button" onClick={onClose}>Close</button>
            <button className="rounded-lg bg-blue-100 px-3.5 py-2.5 font-extrabold text-blue-900 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={saving}>{saving ? 'Saving...' : appointment ? 'Save changes' : 'Add appointment'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TimePicker({
  label,
  labelId,
  value,
  open,
  includeEmpty = false,
  minTime,
  error,
  conflictError = '',
  onToggle,
  onClose,
  onSelect,
}: {
  label: string;
  labelId: string;
  value: string;
  open: boolean;
  includeEmpty?: boolean;
  minTime?: string;
  error?: string;
  conflictError?: string;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className={fieldClass}>
      <span id={labelId} className={labelClass}>{label}</span>
      <div className="custom-picker relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && onClose()}>
        <button className={triggerClass} type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={labelId} aria-invalid={Boolean(error || conflictError)} aria-describedby={conflictError ? 'edit-time-conflict-error' : undefined} onClick={onToggle}>
          <span>{value ? formatControlTime(value) : `Select ${label.toLowerCase()}`}</span>
          <Clock size={18} aria-hidden="true" />
        </button>
        {open ? (
          <div className={`time-picker-popover ${menuClass} right-0 grid max-h-[220px] gap-1 overflow-y-auto p-1.5 [scrollbar-width:thin]`} role="listbox" aria-labelledby={labelId}>
            {includeEmpty ? (
              <button className={`min-h-8 w-full justify-start rounded-lg bg-transparent px-2.5 text-left text-[13px] font-bold text-slate-900 hover:bg-blue-100 hover:text-blue-800 ${!value ? 'bg-blue-100 text-blue-800' : ''}`} type="button" role="option" aria-selected={!value} onClick={() => {
                onSelect('');
                onClose();
              }}>
                No end time
              </button>
            ) : null}
            {appointmentTimeOptions.map((option) => {
              const disabled = Boolean(minTime && option <= minTime);
              return (
                <button key={option} className={`min-h-8 w-full justify-start rounded-lg bg-transparent px-2.5 text-left text-[13px] font-bold text-slate-900 hover:bg-blue-100 hover:text-blue-800 ${option === value ? 'bg-blue-100 text-blue-800' : ''} ${disabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-slate-900' : ''}`} type="button" role="option" aria-selected={option === value} disabled={disabled} onClick={() => {
                  onSelect(option);
                  onClose();
                }}>
                  {formatControlTime(option)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <small className={`field-error min-h-[2.7em] ${error ? '' : 'invisible'}`} aria-hidden={!error}>{error ?? 'No error'}</small> 
    </div>
  );
}
