export type User = { id: string; name: string; email: string };

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type ChatSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  title: string;
  description: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
};
