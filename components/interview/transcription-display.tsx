'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TranscriptionDisplayProps {
  conversations: Array<{ role: 'user' | 'interviewer'; message: string }>;
  state?: 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';
  isPaused?: boolean;
}

export function TranscriptionDisplay({ conversations, state = 'idle', isPaused = false }: TranscriptionDisplayProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ScrollArea className="flex-1 h-full">
        <div className="space-y-3 sm:space-y-4 p-3 sm:p-6 pr-2 sm:pr-4">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm sm:text-base">
              <div className="text-muted-foreground">Conversation will appear here...</div>
            </div>
          ) : (
            conversations.map((conv, index) => (
              <div
                key={index}
                className={`flex ${conv.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                    conv.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <Badge variant={conv.role === 'user' ? 'secondary' : 'outline'} className="text-xs">
                      {conv.role === 'user' ? 'You' : 'Interviewer'}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{conv.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
