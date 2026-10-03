'use client';

import { Plus, Search } from 'lucide-react';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddAppointment: () => void;
};

export function AppointmentPageHeader({ searchQuery, onSearchChange, onAddAppointment }: Props) {
  return (
    <section className="appointment-page-header col-span-full grid gap-4 rounded-lg border border-blue-100 bg-white px-5 py-4 shadow-[0_18px_45px_rgba(30,58,138,0.08)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="appointment-header-copy">
        <p className="m-0 mb-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Calendar workspace</p>
        <h1 className="m-0 text-[32px] font-black leading-tight text-slate-900">Weekly schedule</h1>
        <p className="m-0 mt-1 max-w-4xl leading-normal text-slate-500">Manage appointments in one calm workspace. Hover any appointment for details, edits, and cancellation.</p>
      </div>
      <div className="appointment-header-tools flex flex-wrap items-center gap-2.5">
        <label className="appointment-search flex min-h-11 min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 text-slate-500 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 sm:flex-none">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, date, status..."
            aria-label="Search appointments"
          />
        </label>
        <button className="add-appointment-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-100 px-3.5 py-2.5 font-extrabold text-blue-900 hover:bg-blue-200" type="button" onClick={onAddAppointment}>
          <Plus size={18} />
          Add appointment
        </button>
      </div>
    </section>
  );
}
