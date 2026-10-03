import type { ChatMessage } from '../../types';

type WidgetBookingState = {
  messages: ChatMessage[];
  historyMessages: ChatMessage[];
  input: string;
  showHistory: boolean;
};

export function appendPendingUserMessage(
  messages: ChatMessage[],
  historyMessages: ChatMessage[],
  userMessage: ChatMessage,
) {
  return {
    messages: [...messages, userMessage],
    historyMessages: [...historyMessages, userMessage],
  };
}

export function appendAssistantMessage(
  messages: ChatMessage[],
  historyMessages: ChatMessage[],
  assistantMessage: ChatMessage,
) {
  return {
    messages: [...messages, assistantMessage],
    historyMessages: [...historyMessages, assistantMessage],
  };
}

export function freshBookingState(state: WidgetBookingState): WidgetBookingState {
  return {
    messages: state.messages,
    historyMessages: state.historyMessages,
    input: '',
    showHistory: state.showHistory,
  };
}
