'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AgendaList } from '@/components/appointments/AgendaList';
import { AppointmentDialog } from '@/components/appointments/AppointmentDialog';
import { AppointmentPageHeader } from '@/components/appointments/AppointmentPageHeader';
import { SchedulerBoard } from '@/components/appointments/SchedulerBoard';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';
import { AuthGate } from '@/components/ui/AuthGate';
import { api } from '@/lib/api/client';
import { appointmentStatusDisplayName } from '@/lib/appointments/statusColors';
import type { Appointment } from '@/types';
import {
  addDays,
  formatDisplayDate,
  normalizeTime,
  parseDate,
  sortAppointments,
  startOfWeek,
  toDateKey,
  type AppointmentFormValues,
} from '@/components/appointments/calendarUtils';

export default function AppointmentsPage() {
  return (
    <AuthGate requireAuth>
      <AppointmentsContent />
    </AuthGate>
  );
}

function AppointmentsContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    api.appointments()
      .then((items) => {
        const sorted = sortAppointments(items);
        setAppointments(sorted);
        if (sorted[0]) setViewDate(parseDate(sorted[0].appointmentDate));
      })
      .catch((caught) => setError((caught as Error).message));
  }, []);

  const weekStart = startOfWeek(viewDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart.toDateString()]);
  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((appointment) => {
      const searchable = [
        appointment.title,
        appointment.description ?? '',
        appointment.appointmentDate,
        formatDisplayDate(appointment.appointmentDate),
        normalizeTime(appointment.startTime),
        normalizeTime(appointment.endTime),
        appointmentStatusDisplayName(appointment.status),
        appointment.status,
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [appointments, searchQuery]);
  const appointmentsByDay = useMemo(() => {
    const grouped = new Map(weekDays.map((day) => [toDateKey(day), [] as Appointment[]]));
    filteredAppointments.forEach((appointment) => {
      const dayAppointments = grouped.get(appointment.appointmentDate);
      if (dayAppointments) dayAppointments.push(appointment);
    });
    return grouped;
  }, [filteredAppointments, weekDays]);

  useEffect(() => {
    if (!selectedAppointmentId) return;
    const calendarGrid = calendarGridRef.current;
    const eventElement = eventRefs.current.get(selectedAppointmentId);
    if (!calendarGrid || !eventElement) return;

    requestAnimationFrame(() => {
      const gridRect = calendarGrid.getBoundingClientRect();
      const eventRect = eventElement.getBoundingClientRect();
      const top = calendarGrid.scrollTop + eventRect.top - gridRect.top - 96;
      const left = calendarGrid.scrollLeft + eventRect.left - gridRect.left - Math.max(0, (gridRect.width - eventRect.width) / 2);

      calendarGrid.scrollTo({
        top: Math.max(0, top),
        left: Math.max(0, left),
        behavior: 'smooth',
      });
    });
  }, [selectedAppointmentId, weekStart.toDateString(), filteredAppointments]);

  function selectAppointment(appointment: Appointment) {
    setSelectedAppointmentId(appointment.id);
    setViewDate(parseDate(appointment.appointmentDate));
  }

  function replaceAppointment(updated: Appointment) {
    setAppointments((current) => sortAppointments(current.map((appointment) => (appointment.id === updated.id ? updated : appointment))));
    setViewDate(parseDate(updated.appointmentDate));
  }

  function addAppointment(appointment: Appointment) {
    setAppointments((current) => sortAppointments([appointment, ...current.filter((item) => item.id !== appointment.id)]));
    setViewDate(parseDate(appointment.appointmentDate));
  }

  function openEditor(appointment: Appointment) {
    setEditingAppointment(appointment);
    setOpenMenuId(null);
  }

  async function saveAppointment(values: AppointmentFormValues) {
    if (!editingAppointment) return;
    setSavingAppointment(true);
    setError('');
    try {
      const updated = await api.updateAppointment(editingAppointment.id, values);
      replaceAppointment(updated);
      setEditingAppointment(null);
      setOpenMenuId(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSavingAppointment(false);
    }
  }

  async function createAppointment(values: AppointmentFormValues) {
    setSavingAppointment(true);
    setError('');
    try {
      const created = await api.createAppointment({
        ...values,
        endTime: values.endTime ?? undefined,
      });
      addAppointment(created);
      setCreatingAppointment(false);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSavingAppointment(false);
    }
  }

  async function cancelAppointment(appointment: Appointment) {
    setPendingActionId(appointment.id);
    setError('');
    try {
      const updated = await api.updateAppointment(appointment.id, { status: 'CANCELLED' });
      replaceAppointment(updated);
      setOpenMenuId(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <main className="appointment-dashboard mx-auto my-4 grid min-h-[calc(100vh-96px)] w-[min(1340px,calc(100%_-_32px))] items-stretch gap-3.5">
      <AppointmentPageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddAppointment={() => setCreatingAppointment(true)}
      />
      <AgendaList
        appointments={filteredAppointments}
        totalAppointments={appointments.length}
        selectedAppointmentId={selectedAppointmentId}
        onSelectAppointment={selectAppointment}
        onOpenAppointment={openEditor}
      />
      <SchedulerBoard
        appointments={filteredAppointments}
        totalAppointments={appointments.length}
        appointmentsByDay={appointmentsByDay}
        calendarGridRef={calendarGridRef}
        eventRefs={eventRefs}
        error={error}
        openMenuId={openMenuId}
        pendingActionId={pendingActionId}
        selectedAppointmentId={selectedAppointmentId}
        weekDays={weekDays}
        weekStart={weekStart}
        onCancelAppointment={cancelAppointment}
        onEditAppointment={openEditor}
        onMenuToggle={(appointmentId) => setOpenMenuId((current) => (current === appointmentId ? null : appointmentId))}
        onSelectAppointment={selectAppointment}
        onViewDateChange={setViewDate}
        onToday={() => setViewDate(new Date())}
      />

      {editingAppointment ? (
        <AppointmentDialog
          appointment={editingAppointment}
          appointments={appointments}
          saving={savingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSave={saveAppointment}
        />
      ) : null}
      {creatingAppointment ? (
        <AppointmentDialog
          appointments={appointments}
          saving={savingAppointment}
          onClose={() => setCreatingAppointment(false)}
          onSave={createAppointment}
        />
      ) : null}
      <FloatingChatWidget onAppointmentCreated={addAppointment} />
    </main>
  );
}
