'use client';

import type { Appointment } from '@/types';
import { appointmentStatusDisplayName } from '@/lib/appointments/statusColors';
import { normalizeTime, statusClasses } from './calendarUtils';

type Props = {
  appointments: Appointment[];
  totalAppointments: number;
  selectedAppointmentId: string | null;
  onSelectAppointment: (appointment: Appointment) => void;
  onOpenAppointment?: (appointment: Appointment) => void;
};

export function AgendaList({ appointments, totalAppointments, selectedAppointmentId, onSelectAppointment, onOpenAppointment }: Props) {
  return (
    <aside className="appointment-list-panel grid min-h-0 grid-rows-[auto_1fr] rounded-lg border border-blue-100 bg-white p-4 shadow-[0_18px_45px_rgba(30,58,138,0.08)]">
      <div className="queue-header flex items-center justify-between">
        <div>
          <p className="m-0 mb-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Agenda</p>
          <h2 className="m-0 text-[22px] font-bold text-slate-900">Upcoming</h2>
        </div>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-slate-100 px-2 text-xs font-extrabold text-slate-500">{appointments.length}</span>
      </div>
      <div className="appointment-scroll-list min-h-0 overflow-y-auto pr-1">
        {appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-blue-100 p-5 text-center text-slate-500">{totalAppointments === 0 ? 'No appointments yet.' : 'No appointments match your search.'}</div>
        ) : appointments.map((appointment) => (
          <article
            key={appointment.id}
            className={`appointment-list-item w-full rounded-lg border bg-white p-4 text-left text-slate-900 shadow-[0_10px_30px_rgba(23,32,51,0.04)] transition hover:border-blue-200 hover:bg-slate-50 hover:outline hover:outline-2 hover:outline-blue-500/10 ${appointment.status === 'CANCELLED' ? 'cancelled opacity-70' : ''} ${selectedAppointmentId === appointment.id ? 'active border-blue-200 bg-slate-50 outline outline-2 outline-blue-500/10' : 'border-blue-100'}`}
            aria-current={selectedAppointmentId === appointment.id ? 'true' : undefined}
          >
            <div className="appointment-list-content min-w-0">
              <button
                className="appointment-list-summary min-w-0 bg-transparent p-0 text-left shadow-none hover:bg-transparent"
                type="button"
                onClick={() => onSelectAppointment(appointment)}
              >
                <span className="appointment-list-topline min-w-0">
                  <span className={`appointment-status-pill ${appointment.status.toLowerCase()} shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClasses(appointment.status)}`}>
                    {appointmentStatusDisplayName(appointment.status)}
                  </span>
                </span>
                <strong className={`appointment-list-title min-w-0 text-[15px] text-slate-900 ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}>
                  {appointment.title}
                </strong>
                <span className="appointment-meta text-sm text-slate-500">
                  {normalizeTime(appointment.startTime)}{appointment.endTime ? ` - ${normalizeTime(appointment.endTime)}` : ''}
                </span>
              </button>
              <button className="appointment-list-action" type="button" onClick={() => (onOpenAppointment ?? onSelectAppointment)(appointment)}>
                Details
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
