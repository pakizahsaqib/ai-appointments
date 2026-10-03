export type AppointmentHoverPlacement = 'above' | 'below';
export type AppointmentHoverAlign = 'left' | 'center' | 'right';

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function appointmentHoverPlacement(startTime: string, endTime: string | null): AppointmentHoverPlacement {
  const noon = 12 * 60;
  const start = minutesFromTime(startTime);
  const end = endTime ? minutesFromTime(endTime) : start + 60;

  return start >= noon || end >= noon ? 'above' : 'below';
}

export function appointmentHoverAlignForDay(dayIndex: number): AppointmentHoverAlign {
  return dayIndex >= 4 ? 'left' : 'right';
}

export function appointmentHoverCardPositionClasses(placement: AppointmentHoverPlacement, align: AppointmentHoverAlign) {
  const verticalClass = placement === 'above' ? 'top-auto bottom-0' : 'top-0 bottom-auto';
  const horizontalClass = align === 'left' ? 'right-[calc(100%+14px)] left-auto' : 'left-[calc(100%+14px)] right-auto';

  return `${verticalClass} ${horizontalClass}`;
}
