export type ChatHistoryMessage = {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
};

export type ExistingAppointmentSummary = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  status: string;
};

export type AppointmentExtraction = {
  intent: 'BOOK_APPOINTMENT' | 'UPDATE_APPOINTMENT' | 'CANCEL_APPOINTMENT' | 'GENERAL_QUERY';
  appointment: {
    title: string;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    description: string | null;
  } | null;
  targetAppointmentId?: string | null;
  targetAppointment?: {
    date: string | null;
    startTime: string | null;
    title: string | null;
  };
  missingFields: string[];
  clarificationQuestion: string | null;
  assistantMessage: string | null;
};
