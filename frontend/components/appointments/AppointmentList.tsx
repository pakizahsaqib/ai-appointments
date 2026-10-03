import { appointmentStatusDisplayName } from '@/lib/appointments/statusColors';
import type { Appointment } from '@/types';

export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return <div className="empty">No appointments yet.</div>;
  }

  return (
    <div className="appointment-list">
      {appointments.map((appointment) => (
        <article key={appointment.id} className="panel appointment-item">
          <strong>{appointment.title}</strong>
          <div className="appointment-meta">
            {appointment.appointmentDate} at {appointment.startTime.slice(0, 5)} · {appointmentStatusDisplayName(appointment.status)}
          </div>
          {appointment.description ? <p>{appointment.description}</p> : null}
        </article>
      ))}
    </div>
  );
}
