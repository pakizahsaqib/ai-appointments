'use client';

import { type CSSProperties, type RefObject } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { calendarStatusEventClass } from '@/lib/appointments/statusColors';
import { appointmentHoverAlignForDay, appointmentHoverPlacement } from '@/lib/appointments/hoverPlacement';
import type { Appointment } from '@/types';
import { AppointmentHoverCard } from './AppointmentHoverCard';
import {
  dayLabels,
  eventStyle,
  formatHour,
  formatMonth,
  formatWeekRange,
  normalizeTime,
  timeSlots,
  slotHeight,
  toDateKey,
} from './calendarUtils';

type Props = {
  appointments: Appointment[];
  totalAppointments: number;
  appointmentsByDay: Map<string, Appointment[]>;
  calendarGridRef: RefObject<HTMLDivElement | null>;
  eventRefs: RefObject<Map<string, HTMLDivElement>>;
  error: string;
  openMenuId: string | null;
  pendingActionId: string | null;
  selectedAppointmentId: string | null;
  weekDays: Date[];
  weekStart: Date;
  onCancelAppointment: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onMenuToggle: (appointmentId: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onViewDateChange: (updater: (current: Date) => Date) => void;
  onToday: () => void;
};

export function SchedulerBoard({
  appointments,
  totalAppointments,
  appointmentsByDay,
  calendarGridRef,
  eventRefs,
  error,
  openMenuId,
  pendingActionId,
  selectedAppointmentId,
  weekDays,
  weekStart,
  onCancelAppointment,
  onEditAppointment,
  onMenuToggle,
  onSelectAppointment,
  onViewDateChange,
  onToday,
}: Props) {
  return (
    <section className="scheduler-board grid grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_18px_45px_rgba(30,58,138,0.08)]">
      <header className="scheduler-toolbar flex min-h-[72px] items-center justify-between gap-4 border-b border-blue-100 px-5 py-4 max-[840px]:flex-col max-[840px]:items-start">
        <div className="month-control flex min-w-[260px] items-center gap-2 text-slate-800">
          <CalendarDays size={18} />
          <div>
            <strong>{formatMonth(weekStart)}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">{formatWeekRange(weekDays)}</span>
          </div>
        </div>
        <div className="week-controls flex items-center gap-2">
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 bg-white p-0 text-slate-600 hover:bg-blue-50" type="button" aria-label="Previous week" onClick={() => onViewDateChange((current) => addDaysLocal(current, -7))}>
            <ChevronLeft size={16} />
          </button>
          <button className="min-h-8 min-w-[70px] rounded-lg border border-blue-100 bg-white px-3 text-sm font-extrabold text-slate-600 hover:bg-blue-50" type="button" onClick={onToday}>Today</button>
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 bg-white p-0 text-slate-600 hover:bg-blue-50" type="button" aria-label="Next week" onClick={() => onViewDateChange((current) => addDaysLocal(current, 7))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </header>
      {error ? <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</div> : null}
      <div ref={calendarGridRef} className="calendar-grid relative grid max-h-[calc(100vh-186px)] min-h-[720px] overflow-auto bg-white [grid-template-columns:72px_repeat(7,minmax(132px,1fr))] [grid-template-rows:64px_minmax(calc(var(--slot-count)*var(--slot-height)),1fr)] max-[840px]:[grid-template-columns:64px_repeat(7,136px)]" style={{ '--slot-count': timeSlots.length, '--slot-height': `${slotHeight}px` } as CSSProperties}>
        <div className="timezone-cell sticky left-0 top-0 z-[4] flex items-center justify-center border-b border-slate-100 bg-white text-xs text-slate-500">GMT+5</div>
        {weekDays.map((day, index) => (
          <div key={toDateKey(day)} className={`day-heading sticky top-0 z-[3] grid place-items-center content-center gap-1 border-b border-l border-slate-100 bg-white text-xs text-slate-500 ${toDateKey(day) === toDateKey(new Date()) ? 'today' : ''}`}>
            <span>{dayLabels[index]}</span>
            <strong className={`grid h-8 w-8 place-items-center rounded-full text-lg ${toDateKey(day) === toDateKey(new Date()) ? 'bg-blue-900 text-white' : 'text-slate-700'}`}>{day.getDate()}</strong>
          </div>
        ))}
        <div className="time-ruler sticky left-0 z-[2] col-start-1 row-start-2 bg-white">
          {timeSlots.map((hour) => (
            <div key={hour} className="time-cell h-[var(--slot-height)] border-b border-slate-100 pr-3 pt-2.5 text-right text-xs text-slate-500">{formatHour(hour)}</div>
          ))}
        </div>
        {weekDays.map((day, dayIndex) => {
          const dayAppointments = appointmentsByDay.get(toDateKey(day)) ?? [];
          return (
            <div key={`column-${toDateKey(day)}`} className="day-column relative row-start-2 min-h-[calc(var(--slot-count)*var(--slot-height))] border-l border-slate-100">
              {timeSlots.map((hour) => <div key={hour} className="hour-line h-[var(--slot-height)] border-b border-slate-100" />)}
              {dayAppointments.map((appointment) => {
                return (
                  <div
                    key={appointment.id}
                    ref={(node) => {
                      if (node) {
                        eventRefs.current.set(appointment.id, node);
                      } else {
                        eventRefs.current.delete(appointment.id);
                      }
                    }}
                    className={`calendar-event-wrap group absolute left-2 right-2 top-[var(--event-top)] z-[1] min-h-11 hover:z-[8] focus-within:z-[8] ${appointment.status.toLowerCase()} ${appointment.status === 'CANCELLED' ? 'cancelled' : ''} ${selectedAppointmentId === appointment.id ? 'selected ring-2 ring-blue-300' : ''}`}
                    style={eventStyle(appointment)}
                  >
                    <button className={`calendar-event grid h-full w-full content-start justify-items-start gap-1 rounded-lg border p-2.5 text-left text-slate-700 shadow-none outline-none hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${calendarStatusEventClass(appointment.status)}`} type="button" onClick={() => onSelectAppointment(appointment)}>
                      <strong className={`max-w-full text-[13px] leading-tight text-slate-800 [overflow-wrap:anywhere] ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}>{appointment.title}</strong>
                      <small className="max-w-full overflow-hidden text-ellipsis text-xs leading-tight text-slate-500">
                        {normalizeTime(appointment.startTime)}{appointment.endTime ? ` - ${normalizeTime(appointment.endTime)}` : ''}
                      </small>
                    </button>
                    <AppointmentHoverCard
                      appointment={appointment}
                      placement={appointmentHoverPlacement(appointment.startTime, appointment.endTime)}
                      align={appointmentHoverAlignForDay(dayIndex)}
                      menuOpen={openMenuId === appointment.id}
                      pending={pendingActionId === appointment.id}
                      onMenuToggle={() => onMenuToggle(appointment.id)}
                      onEdit={() => onEditAppointment(appointment)}
                      onCancel={() => onCancelAppointment(appointment)}
                      onDetails={() => onEditAppointment(appointment)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
        {appointments.length === 0 ? (
          <div className="col-start-2 col-end-[-1] row-start-2 place-self-center text-slate-500">{totalAppointments === 0 ? 'No scheduled appointments yet.' : 'No matching appointments in this week.'}</div>
        ) : null}
      </div>
    </section>
  );
}

function addDaysLocal(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}
