'use client';

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

interface VoiceRecordingOrbProps {
  state: ConversationState;
  isPaused: boolean;
}

export function VoiceRecordingOrb({ state, isPaused }: VoiceRecordingOrbProps) {
  // Map states to theme colors
  const getStateColor = () => {
    if (isPaused) return 'bg-gray-300';
    switch (state) {
      case 'listening': // User speaking
        return 'bg-dialogue-coral shadow-dialogue-coral/50';
      case 'speaking': // AI speaking
        return 'bg-morality-teal shadow-morality-teal/50';
      case 'processing':
        return 'bg-reason-purple animate-pulse';
      case 'idle':
      default:
        return 'bg-ethics-black/20';
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow/ring */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-500 ${state === 'listening' ? 'scale-150 opacity-20 bg-dialogue-coral' :
            state === 'speaking' ? 'scale-125 opacity-20 bg-morality-teal' :
              state === 'processing' ? 'scale-110 opacity-20 bg-reason-purple' :
                'scale-100 opacity-0'
          }`}
      />

      {/* Main Orb */}
      <div
        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-all duration-500 flex items-center justify-center shadow-lg backdrop-blur-sm ${getStateColor()}`}
        style={{
          animation: (state === 'listening' || state === 'speaking')
            ? 'orb-pulse 2s ease-in-out infinite'
            : 'none',
        }}
      >
        {/* Inner gradient for depth */}
        <div className="w-full h-full rounded-full bg-gradient-to-br from-white/40 to-transparent" />
      </div>

      {/* Status Icon/Text (Optional, can be added for clarity) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {state === 'processing' && (
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
        )}
      </div>
    </div>
  );
}

