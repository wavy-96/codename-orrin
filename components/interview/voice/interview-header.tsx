'use client';

import { Button } from '@/components/ui/button';
import { Pause, Play, Square, MessageSquare, X } from 'lucide-react';

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

interface InterviewHeaderProps {
  jobTitle?: string;
  companyName?: string;
  interviewType?: string;
  difficulty?: string;
  timeRemaining: number;
}

export function InterviewHeader({
  jobTitle,
  companyName,
  interviewType,
  difficulty,
  timeRemaining,
}: InterviewHeaderProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-between items-start z-20 pt-2">
      {/* Interview Info */}
      <div className="flex-1">
        {jobTitle && companyName && (
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-serif text-ethics-black leading-tight">
              {jobTitle} <span className="text-muted-foreground font-sans text-lg font-normal">at {companyName}</span>
            </h1>
            {interviewType && difficulty && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-black/5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {interviewType}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black/5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {difficulty}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timer Display - Minimalist */}
      <div className={`font-mono text-xl font-medium tabular-nums tracking-tight ${timeRemaining <= 60 ? 'text-dialogue-coral animate-pulse' : 'text-muted-foreground'
        }`}>
        {formatTime(timeRemaining)}
      </div>
    </div>
  );
}

