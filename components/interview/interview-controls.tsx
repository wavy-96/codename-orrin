'use client';

interface InterviewControlsProps {
  onEndInterview: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export function InterviewControls({
  onEndInterview,
  isPaused,
  onTogglePause,
}: InterviewControlsProps) {
  // This component can be extended with additional controls
  return null;
}

