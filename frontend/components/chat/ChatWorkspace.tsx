'use client';

import { CalendarClock, CheckCircle2, Send, Sparkles, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { api } from '@/lib/api/client';
import type { Appointment, ChatMessage, ChatSession } from '@/types';

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ChatWorkspace() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        const [sessions, existingAppointments] = await Promise.all([api.sessions(), api.appointments()]);
        const active = sessions[0] ?? (await api.createSession());
        setSession(active);
        setAppointments(existingAppointments);
        setMessages(await api.messages(active.id));
      } catch (caught) {
        setError((caught as Error).message);
      }
    }
    boot();
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!session || !input.trim()) return;
    const content = input.trim();
    setInput('');
    setError('');
    setLoading(true);
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: 'USER', content, createdAt: new Date().toISOString() },
    ]);
    try {
      const response = await api.sendMessage(session.id, content);
      setMessages((current) => [...current, response.assistantMessage]);
      if (response.appointment) {
        setAppointments((current) =>
          current.some((appointment) => appointment.id === response.appointment!.id)
            ? current.map((appointment) => (appointment.id === response.appointment!.id ? response.appointment! : appointment))
            : [response.appointment!, ...current],
        );
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page workspace">
      <section className="panel chat-panel">
        <div className="chat-header">
          <div>
            <div className="chat-title-row">
              <span className="assistant-mark" aria-hidden="true">
                <img className="assistant-logo" src="/ai-assistant-logo.png" alt="" />
              </span>
              <h1>Appointment assistant</h1>
            </div>
            <p>Book, clarify, and confirm appointments from a natural conversation.</p>
          </div>
          <div className="chat-status" aria-label={session ? 'Chat session ready' : 'Starting chat session'}>
            <span className={session ? 'status-dot ready' : 'status-dot'} />
            {session ? 'Ready' : 'Starting'}
          </div>
        </div>
        <div className="messages">
          {error ? <div className="error">{error}</div> : null}
          {messages.length === 0 ? (
            <div className="empty chat-empty">
              <Sparkles size={22} />
              <strong>Start with a simple request</strong>
              <span>Try: “I want to book an appointment tomorrow at 3 PM.”</span>
            </div>
          ) : null}
          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role === 'USER' ? 'user' : 'assistant'}`}>
              <div className="message-avatar" aria-hidden="true">
                {message.role === 'USER' ? <UserRound size={17} /> : <img className="message-avatar-logo" src="/ai-assistant-logo.png" alt="" />}
              </div>
              <div className="message-stack">
                <div className="message-meta">
                  <span>{message.role === 'USER' ? 'You' : 'Assistant'}</span>
                  <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                </div>
                <div className={`message ${message.role === 'USER' ? 'user' : 'assistant'}`}>{message.content}</div>
              </div>
            </div>
          ))}
          {loading ? (
            <div className="message-row assistant">
              <div className="message-avatar" aria-hidden="true">
                <img className="message-avatar-logo" src="/ai-assistant-logo.png" alt="" />
              </div>
              <div className="message-stack">
                <div className="message-meta">
                  <span>Assistant</span>
                  <time>Thinking</time>
                </div>
                <div className="message assistant typing-indicator" aria-label="Assistant is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <form className="composer" onSubmit={send}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Book an appointment tomorrow at 3 PM"
            aria-label="Message"
          />
          <button type="submit" disabled={loading || !session}>
            <Send size={18} />
            Send
          </button>
        </form>
      </section>
      <aside className="panel side-panel">
        <div className="side-panel-header">
          <span className="assistant-mark calendar" aria-hidden="true">
            <CalendarClock size={18} />
          </span>
          <div>
            <h2>Schedule desk</h2>
            <p>{appointments.length} appointment{appointments.length === 1 ? '' : 's'} tracked</p>
          </div>
        </div>
        <AppointmentForm appointments={appointments} sessionId={session?.id} onCreated={(appointment) => setAppointments((current) => [appointment, ...current])} />
        <hr />
        <div className="appointment-section-title">
          <CheckCircle2 size={18} />
          <h2>Appointments</h2>
        </div>
        <AppointmentList appointments={appointments} />
      </aside>
    </main>
  );
}
