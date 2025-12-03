'use client';

import { Button } from '@/components/ui/button';
import { X, MessageSquare } from 'lucide-react';
import { TranscriptionDisplay } from '../transcription-display';

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

interface ChatOverlayProps {
  open: boolean;
  conversations: Array<{ role: 'user' | 'interviewer'; message: string }>;
  state: ConversationState;
  isPaused: boolean;
  onClose: () => void;
}

export function ChatOverlay({ open, conversations, state, isPaused, onClose }: ChatOverlayProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white/95 backdrop-blur-xl z-50 shadow-2xl border-l border-white/20 flex flex-col transition-transform duration-300 animate-in slide-in-from-right">
        <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-ethics-black" />
            <h3 className="font-serif font-medium text-lg text-ethics-black">Transcript</h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-warm-sand/20">
          <TranscriptionDisplay 
            conversations={conversations} 
            state={state}
            isPaused={isPaused}
          />
        </div>
      </div>
    </>
  );
}

