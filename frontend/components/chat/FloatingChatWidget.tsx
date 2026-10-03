'use client';

import { Send, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { appendPendingUserMessage } from '@/lib/chat/widgetMessages';
import type { Appointment, ChatMessage, ChatSession } from '@/types';

type Props = {
  onAppointmentCreated?: (appointment: Appointment) => void;
};

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function mergeUniqueMessages(...groups: ChatMessage[][]) {
  const byId = new Map<string, ChatMessage>();
  for (const group of groups) {
    for (const message of group) {
      byId.set(message.id, message);
    }
  }
  return [...byId.values()].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function FloatingChatWidget({ onAppointmentCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function loadHistory() {
    const allMessages = await api.allMessages();
    setHistoryMessages(allMessages);
    return allMessages;
  }

  useEffect(() => {
    async function boot() {
      try {
        const sessions = await api.sessions();
        const active = sessions[0] ?? (await api.createSession());
        setSession(active);
        await loadHistory();
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
    const userMessage: ChatMessage = {
      id: `widget-local-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    setInput('');
    setError('');
    setLoading(true);
    setMessages((current) => appendPendingUserMessage(current, historyMessages, userMessage).messages);
    setHistoryMessages((current) => appendPendingUserMessage(messages, current, userMessage).historyMessages);
    try {
      const response = await api.sendMessage(session.id, content);
      setMessages((current) => {
        const withoutLocal = current.filter((message) => message.id !== userMessage.id);
        return mergeUniqueMessages(withoutLocal, [response.userMessage, response.assistantMessage]);
      });
      setHistoryMessages((current) => {
        const withoutLocal = current.filter((message) => message.id !== userMessage.id);
        return mergeUniqueMessages(withoutLocal, [response.userMessage, response.assistantMessage]);
      });
      if (response.appointment) {
        onAppointmentCreated?.(response.appointment);
        setLoading(false);
        setResettingSession(true);
        await resetAfterSuccessfulBooking();
        setResettingSession(false);
      }
    } catch (caught) {
      setResettingSession(false);
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resetAfterSuccessfulBooking() {
    // Rotate session so the next booking starts without prior AI context,
    // but keep the full visible transcript/history intact.
    const newSession = await api.createSession();
    setSession(newSession);
    setInput('');
    try {
      await loadHistory();
    } catch {
      // Keep the locally accumulated transcript if refresh fails.
    }
  }

  async function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (!next) return;
    setLoadingHistory(true);
    setError('');
    try {
      await loadHistory();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoadingHistory(false);
    }
  }

  function closeWidget() {
    setOpen(false);
    setMessages([]);
    setShowHistory(false);
    setError('');
  }

  const visibleMessages = showHistory ? historyMessages : messages;

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [open, visibleMessages.length, loading, showHistory]);

  return (
    <div className={`ai-widget ${open ? 'open' : ''}`}>
      {open ? (
        <section className="ai-widget-panel" aria-label="AI appointment assistant">
          <header className="ai-widget-header">
            <span className="assistant-mark" aria-hidden="true">
              <img className="assistant-logo" src="/ai-assistant-logo.png" alt="" />
            </span>
            <div>
              <h2>Book with AI</h2>
              <p>{session ? 'Ready for appointment requests' : 'Starting assistant'}</p>
            </div>
            <button className="icon-button" type="button" aria-label="Close assistant" onClick={closeWidget}>
              <X size={18} />
            </button>
          </header>
          <div className="ai-widget-tools">
            <button className="secondary" type="button" onClick={toggleHistory} disabled={loadingHistory}>
              {showHistory ? 'Hide history' : 'Chat history'}
            </button>
          </div>
          <div className="ai-widget-messages">
            {error ? <div className="error">{error}</div> : null}
            {visibleMessages.length === 0 ? (
              <div className="ai-widget-empty">
                <img className="assistant-empty-logo" src="/ai-assistant-logo.png" alt="" aria-hidden="true" />
                <span>
                  {showHistory
                    ? loadingHistory
                      ? 'Loading chat history…'
                      : 'No chat history yet.'
                    : 'Try “Book a checkup tomorrow at 3 PM.”'}
                </span>
              </div>
            ) : null}
            {visibleMessages.map((message) => (
              <div key={message.id} className={`widget-message ${message.role === 'USER' ? 'user' : 'assistant'}`}>
                <span>{message.content}</span>
                <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
              </div>
            ))}
            {loading ? (
              <div className="widget-message assistant typing-indicator" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
          <form className="ai-widget-composer" onSubmit={send}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={resettingSession}
              placeholder="Ask to book an appointment"
              aria-label="AI appointment request"
            />
            <button type="submit" disabled={loading || resettingSession || !session} aria-label="Send appointment request">
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : null}
      <button className="ai-widget-launcher" type="button" onClick={() => setOpen((current) => !current)}>
        <img className="ai-widget-launcher-logo" src="/ai-assistant-logo.png" alt="" aria-hidden="true" />
        Book with AI
      </button>
    </div>
  );
}
