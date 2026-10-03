import type { Appointment, AuthResponse, ChatMessage, ChatSession, User } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'ai_appointment_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with ${response.status}`);
  }
  return response.json();
}

export const api = {
  signup: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<User>('/auth/me'),
  createSession: () => request<ChatSession>('/chat/sessions', { method: 'POST', body: JSON.stringify({ title: 'Appointment chat' }) }),
  sessions: () => request<ChatSession[]>('/chat/sessions'),
  messages: (sessionId: string) => request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`),
  allMessages: () => request<ChatMessage[]>('/chat/messages'),
  sendMessage: (sessionId: string, content: string) =>
    request<{
      userMessage: ChatMessage;
      assistantMessage: ChatMessage;
      appointment: Appointment | null;
    }>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  appointments: () => request<Appointment[]>('/appointments'),
  createAppointment: (body: {
    title: string;
    description?: string;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    status?: Appointment['status'];
    chatSessionId?: string;
  }) => request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  updateAppointment: (id: string, body: Partial<Pick<Appointment, 'title' | 'description' | 'appointmentDate' | 'startTime' | 'endTime' | 'status'>>) =>
    request<Appointment>(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
