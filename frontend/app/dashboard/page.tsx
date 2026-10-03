'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarCheck2, CalendarDays, Clock3, MessageSquare, Sparkles, UserRound, XCircle } from 'lucide-react';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';
import { AuthGate } from '@/components/ui/AuthGate';
import { api } from '@/lib/api/client';
import { appointmentStatusDisplayName } from '@/lib/appointments/statusColors';
import type { Appointment, User } from '@/types';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    month: date.toLocaleDateString(undefined, { month: 'short' }),
  };
}

function sortAppointments(items: Appointment[]) {
  return [...items].sort((first, second) => `${first.appointmentDate}T${first.startTime}`.localeCompare(`${second.appointmentDate}T${second.startTime}`));
}

export default function DashboardPage() {
  return (
    <AuthGate requireAuth>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [me, items] = await Promise.all([api.me(), api.appointments()]);
        setUser(me);
        setAppointments(sortAppointments(items));
      } catch (caught) {
        setError((caught as Error).message);
      }
    }
    load();
  }, []);

  const today = dateKey(new Date());
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayAppointments = appointments.filter((appointment) => appointment.appointmentDate === today && appointment.status !== 'CANCELLED');
  const weekAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(`${appointment.appointmentDate}T00:00:00`);
    return appointmentDate >= new Date(`${today}T00:00:00`) && appointmentDate <= weekEnd && appointment.status !== 'CANCELLED';
  });
  const draftCount = appointments.filter((appointment) => appointment.status === 'PENDING').length;
  const cancelledCount = appointments.filter((appointment) => appointment.status === 'CANCELLED').length;
  const aiCreatedCount = appointments.filter((appointment) => appointment.description?.toLowerCase().includes('chat')).length;
  const nextAppointment = appointments.find((appointment) => appointment.status !== 'CANCELLED') ?? null;
  const nextAppointmentDate = nextAppointment ? formatDateParts(nextAppointment.appointmentDate) : null;

  return (
    <main className="page dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Schedule overview</p>
          <h1>Good to see you{user?.name ? `, ${user.name}` : ''}.</h1>
          <p>Track today, watch your weekly load, and jump into the calendar when it is time to manage appointments.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="button" href="/appointments">
            <CalendarDays size={18} />
            Open calendar
          </Link>
        </div>
      </section>
      {error ? <div className="error">{error}</div> : null}
      <section className="dashboard-grid">
        <div className="panel stat pastel-logo">
          <CalendarCheck2 size={22} />
          <p>Today</p>
          <strong>{todayAppointments.length}</strong>
        </div>
        <div className="panel stat pastel-ice">
          <Clock3 size={22} />
          <p>Next 7 days</p>
          <strong>{weekAppointments.length}</strong>
        </div>
        <div className="panel stat pastel-sky">
          <MessageSquare size={22} />
          <p>AI assisted</p>
          <strong>{aiCreatedCount}</strong>
        </div>
        <div className="panel stat pastel-peach">
          <XCircle size={22} />
          <p>Cancelled</p>
          <strong>{cancelledCount}</strong>
        </div>
      </section>
      <section className="dashboard-content">
        <article className="panel dashboard-next-card">
          <div className="dashboard-section-title">
            <Sparkles size={19} />
            <h2>Next appointment</h2>
          </div>
          {nextAppointment ? (
            <div className="next-appointment">
              <div className="next-appointment-date">
                <span>{nextAppointmentDate?.month}</span>
                <strong>{nextAppointmentDate?.day}</strong>
              </div>
              <div className="next-appointment-copy">
                <span>Highlight of the day</span>
                <strong>{nextAppointment.title}</strong>
                <p>{nextAppointment.startTime.slice(0, 5)}{nextAppointment.endTime ? ` - ${nextAppointment.endTime.slice(0, 5)}` : ''} · {appointmentStatusDisplayName(nextAppointment.status)}</p>
              </div>
            </div>
          ) : (
            <div className="empty">No upcoming appointments yet.</div>
          )}
        </article>
        <article className="panel dashboard-summary-card">
          <div className="dashboard-section-title">
            <UserRound size={19} />
            <h2>Operations</h2>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Total appointments</dt>
              <dd>{appointments.length}</dd>
            </div>
            <div>
              <dt>Drafts</dt>
              <dd>{draftCount}</dd>
            </div>
            <div>
              <dt>Primary workspace</dt>
              <dd>Calendar</dd>
            </div>
          </dl>
        </article>
      </section>
      <FloatingChatWidget onAppointmentCreated={(appointment) => setAppointments((current) => sortAppointments([appointment, ...current.filter((item) => item.id !== appointment.id)]))} />
    </main>
  );
}
