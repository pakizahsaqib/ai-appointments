'use client';

import { Ban, ChevronRight, ExternalLink, MoreHorizontal, Pencil } from 'lucide-react';
import { appointmentHoverCardPositionClasses } from '@/lib/appointments/hoverPlacement';
import { appointmentStatusDisplayName } from '@/lib/appointments/statusColors';
import type { Appointment } from '@/types';
import { appointmentColor, colorClasses, formatDisplayDate, normalizeTime } from './calendarUtils';

type Props = {
  appointment: Appointment;
  placement: 'above' | 'below';
  align: 'left' | 'center' | 'right';
  menuOpen: boolean;
  pending: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDetails: () => void;
};

export function AppointmentHoverCard({ appointment, placement, align, menuOpen, pending, onMenuToggle, onEdit, onCancel, onDetails }: Props) {
  const timeRange = `${normalizeTime(appointment.startTime)}${appointment.endTime ? ` - ${normalizeTime(appointment.endTime)}` : ''}`;
  const positionClass = appointmentHoverCardPositionClasses(placement, align);

  return (
    <div className={`appointment-hover-card ${placement} ${align} pointer-events-none absolute ${positionClass} z-20 grid w-[min(360px,72vw)] translate-y-2 scale-[0.98] gap-3.5 rounded-lg border border-slate-200 bg-white/[0.98] p-[18px] text-left text-slate-900 opacity-0 shadow-[0_22px_60px_rgba(23,32,51,0.16)] transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 max-[840px]:left-0 max-[840px]:right-auto max-[840px]:top-[calc(100%+10px)] max-[840px]:bottom-auto max-[840px]:w-[min(320px,calc(100vw-48px))]`} role="group" aria-label={`${appointment.title} appointment details`}>
      <div className="hover-card-header grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div className={`avatar-dot ${appointmentColor(appointment)} grid h-12 w-12 place-items-center rounded-full border text-base font-black text-slate-800 ${colorClasses(appointmentColor(appointment))}`}>
          {appointment.title.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="m-0 text-lg font-bold leading-tight text-slate-900">{appointment.title}</h2>
          <p className="mt-1 text-[13px] leading-snug text-slate-500">{appointment.description ?? 'Created from chat or the appointment form.'}</p>
        </div>
        <div className="hover-card-menu relative">
          <button className="hover-card-menu-trigger grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white p-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700" type="button" aria-label="Appointment actions" onClick={onMenuToggle}>
            <MoreHorizontal size={20} />
          </button>
          {menuOpen ? (
            <div className="hover-card-menu-list absolute right-[-10px] top-[calc(100%+10px)] z-30 grid w-60 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(23,32,51,0.14)]">
              <button className="grid w-full grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-2 rounded-lg bg-transparent px-3 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50" type="button" onClick={onEdit}>
                <Pencil size={15} />
                <span className="truncate">Edit</span>
                <ChevronRight size={14} />
              </button>
              <button className="grid w-full grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-2 rounded-lg bg-transparent px-3 py-2.5 text-left text-[13px] text-red-700 hover:bg-red-50 disabled:opacity-50" type="button" disabled={pending || appointment.status === 'CANCELLED'} onClick={onCancel}>
                <Ban size={15} />
                <span className="truncate">{pending ? 'Cancelling...' : 'Cancel appointment'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="hover-card-divider h-px bg-slate-100" />
      <div className="hover-card-grid grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <span className="block text-xs font-bold text-slate-500">Date</span>
          <strong className="mt-1 block [overflow-wrap:anywhere] text-sm leading-snug text-slate-800">{formatDisplayDate(appointment.appointmentDate)}</strong>
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-bold text-slate-500">Status</span>
          <strong className="mt-1 block [overflow-wrap:anywhere] text-sm leading-snug text-slate-800">{appointmentStatusDisplayName(appointment.status)}</strong>
        </div>
      </div>
      <div className="hover-card-timeline grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <TimelineRow time={normalizeTime(appointment.startTime)} label="Appointment starts" />
        <TimelineRow time={appointment.endTime ? normalizeTime(appointment.endTime) : 'Open'} label={appointment.endTime ? 'Appointment ends' : 'Duration not set'} />
      </div>
      <button className="hover-card-action grid min-h-12 grid-cols-[1fr_auto_auto] items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-0 text-sm font-extrabold text-slate-700 shadow-[0_8px_22px_rgba(23,32,51,0.06)] hover:border-blue-200 hover:bg-slate-50" type="button" onClick={onDetails}>
        <span>View full details</span>
        <small className="text-xs font-extrabold text-slate-500">{timeRange}</small>
        <ExternalLink size={17} />
      </button>
    </div>
  );
}

function TimelineRow({ time, label }: { time: string; label: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[52px_18px_minmax(0,1fr)] items-center gap-2.5">
      <span className="block text-xs font-bold text-slate-500">{time}</span>
      <i className="h-3.5 w-3.5 rounded-full border-[3px] border-blue-500 bg-white shadow-[0_0_0_3px_#dbeafe]" />
      <strong className="text-[13px] leading-tight text-slate-700">{label}</strong>
    </div>
  );
}
