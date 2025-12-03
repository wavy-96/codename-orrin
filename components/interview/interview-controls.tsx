import { Button } from '@/components/ui/button';
import { Pause, Play, Square, MessageSquare, X, Video, VideoOff } from 'lucide-react';

interface InterviewControlsProps {
  onEndInterview: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  state: string;
  isVideoEnabled?: boolean;
  onToggleVideo?: () => void;
}

export function InterviewControls({
  onEndInterview,
  isPaused,
  onTogglePause,
  showChat,
  onToggleChat,
  state,
  isVideoEnabled = false,
  onToggleVideo,
}: InterviewControlsProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 p-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleChat}
          className={`rounded-full w-12 h-12 transition-all duration-300 ${showChat ? 'bg-ethics-black text-white hover:bg-ethics-black/90' : 'hover:bg-black/5 text-muted-foreground'
            }`}
        >
          {showChat ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </Button>

        {onToggleVideo && (
          <>
            <div className="w-px h-6 bg-black/10 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVideo}
              className={`rounded-full w-12 h-12 transition-all duration-300 ${isVideoEnabled
                  ? 'bg-morality-teal text-white hover:bg-morality-teal/90'
                  : 'hover:bg-black/5 text-muted-foreground'
                }`}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          </>
        )}

        <div className="w-px h-6 bg-black/10 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePause}
          disabled={state === 'processing'}
          className={`rounded-full w-14 h-14 transition-all duration-300 ${isPaused
              ? 'bg-dialogue-coral text-white hover:bg-dialogue-coral/90 shadow-lg shadow-dialogue-coral/20'
              : 'bg-ethics-black text-white hover:bg-ethics-black/90 shadow-lg shadow-black/10'
            }`}
        >
          {isPaused ? (
            <Play className="h-6 w-6 ml-1" />
          ) : (
            <Pause className="h-6 w-6" />
          )}
        </Button>

        <div className="w-px h-6 bg-black/10 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onEndInterview}
          disabled={state === 'processing'}
          className="rounded-full w-12 h-12 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Square className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

