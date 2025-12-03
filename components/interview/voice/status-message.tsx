'use client';

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

interface StatusMessageProps {
  state: ConversationState;
  isPaused: boolean;
  isFirstQuestion?: boolean;
}

export function StatusMessage({ state, isPaused, isFirstQuestion = false }: StatusMessageProps) {
  const getMessage = () => {
    if (isPaused) return 'Interview paused';
    if (state === 'idle') {
      return isFirstQuestion
        ? 'Ready to listen... Speak naturally'
        : 'Interview in progress...';
    }
    if (state === 'listening') return 'Recording your response...';
    if (state === 'processing') return isFirstQuestion ? 'Connecting to interviewer...' : 'Processing your response...';
    if (state === 'speaking') return 'Interviewer is speaking...';
    return '';
  };

  return (
    <div className="text-sm sm:text-base text-muted-foreground text-center px-4">
      {getMessage()}
    </div>
  );
}

