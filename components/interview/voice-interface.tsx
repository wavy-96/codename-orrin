'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { InterviewControls } from './interview-controls';
import { checkBrowserCompatibility } from '@/lib/utils/browser-compatibility';
import {
  areTracksActive,
  setupVisibilityHandlers,
} from '@/lib/utils/mobile-audio-fixes';
import { StartInterviewScreen } from './voice/start-interview-screen';
import { InterviewHeader } from './voice/interview-header';
import { VoiceRecordingOrb } from './voice/voice-recording-orb';
import { StatusMessage } from './voice/status-message';
import { ChatOverlay } from './voice/chat-overlay';
import { PauseModal } from './voice/pause-modal';
import { CompletionModal } from './voice/completion-modal';
import { UserVideo } from './voice/user-video';
import { useOpenAIRealtime } from './voice/use-realtime-connection';

interface VoiceInterfaceProps {
  interviewId: string;
  durationMinutes?: number;
  jobTitle?: string;
  companyName?: string;
  interviewType?: string;
  difficulty?: string;
  startedAt?: string | null;
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

export function VoiceInterface({
  interviewId,
  durationMinutes = 5,
  jobTitle,
  companyName,
  interviewType,
  difficulty,
  startedAt
}: VoiceInterfaceProps) {
  const router = useRouter();
  const [state, setState] = useState<ConversationState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [conversations, setConversations] = useState<Array<{ role: 'user' | 'interviewer'; message: string }>>([]);
  const [showChat, setShowChat] = useState(false);
  const totalDuration = durationMinutes * 60;

  // Realtime Hook
  const { connect, disconnect, isConnected } = useOpenAIRealtime({
    interviewId,
    onMessage: (role, text) => {
      setConversations(prev => {
        // Deduplicate simplisticly if needed, but appending is fine for transcript log
        return [...prev, { role, message: text }];
      });
    },
    onStatusChange: (newStatus) => {
      if (isPaused) return; // Don't override paused state
      if (newStatus === 'connecting') setState('processing');
      else if (newStatus === 'connected') setState('idle');
      else if (newStatus === 'speaking') setState('speaking');
      else if (newStatus === 'listening') setState('listening');
      else if (newStatus === 'idle') setState('idle');
      else if (newStatus === 'error') {
        console.error("Realtime connection error");
        setState('idle');
      }
    }
  });

  // Timer State
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(() => {
    if (startedAt) {
      const startTime = new Date(startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= totalDuration) return null;
      return startTime;
    }
    return null;
  });

  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (startedAt) {
      const startTime = new Date(startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, totalDuration - elapsed);
    }
    return totalDuration;
  });

  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => !!startedAt);
  const [browserCompatibility, setBrowserCompatibility] = useState<ReturnType<typeof checkBrowserCompatibility> | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('nova'); // Used for REST API, but Realtime API has fixed voice for now ('verse') or passed in session config. 
  // Note: 'verse' is one of the Realtime voices. To use 'nova', we configure it in the session endpoint.

  const streamRef = useRef<MediaStream | null>(null);
  const hasInitializedRef = useRef(false);

  // Initial Setup
  useEffect(() => {
    const compatibility = checkBrowserCompatibility();
    setBrowserCompatibility(compatibility);

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Initialize basic stream (no audio context needed manually anymore)
    const init = async () => {
      if (compatibility.getUserMedia) {
        await initializeStream(isVideoEnabled);
      }
    };
    init();

    const cleanupVisibility = setupVisibilityHandlers((isVisible) => {
      if (!isVisible) {
        // Handle backgrounding if needed (Realtime API might handle this via WebRTC state)
      }
    });

    return () => {
      cleanupVisibility();
      disconnect();
      stopStream();
    };
  }, [isVideoEnabled, disconnect]);

  // Timer Logic
  useEffect(() => {
    if (!interviewStartTime) return;
    if (isPaused) {
      if (!pausedAt) setPausedAt(Date.now());
      return;
    }
    if (pausedAt) {
      setTotalPausedTime(prev => prev + Math.floor((Date.now() - pausedAt) / 1000));
      setPausedAt(null);
    }

    const interval = setInterval(() => {
      const totalElapsed = Math.floor((Date.now() - interviewStartTime) / 1000);
      const actualElapsed = totalElapsed - totalPausedTime;
      const remaining = Math.max(0, totalDuration - actualElapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setTimeRemaining(0);
        handleEndInterview(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [interviewStartTime, isPaused, totalDuration, totalPausedTime, pausedAt]);

  // Simplified Stream Management (Audio + Optional Video)
  const initializeStream = async (includeVideo = false) => {
    try {
      if (streamRef.current) {
        // Stop existing tracks to be clean
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: includeVideo ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return null;
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleStartInterview = async () => {
    if (!interviewStartTime) {
      setInterviewStartTime(Date.now());
      setTimeRemaining(totalDuration);
    }
    setHasStarted(true);
    setState('processing'); // Connecting...

    // Ensure we have a stream
    let stream = streamRef.current;
    if (!stream || !areTracksActive(stream)) {
      stream = await initializeStream(isVideoEnabled) || undefined;
    }

    // Connect to Realtime API
    if (stream) {
      await connect(stream);
    } else {
      console.error("No stream available to connect");
      setState('idle');
    }
  };

  const handleToggleVideo = async () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    // Re-init stream with new video preference
    // Note: Changing stream mid-call in WebRTC usually requires renegotiation (addTrack/removeTrack).
    // The simple `initializeStream` replaces the stream completely.
    // `useOpenAIRealtime` establishes connection once. 
    // If we replace the stream, we need to update the peer connection sender.
    // The hook doesn't currently expose a "replaceTrack" method. 
    // For now, we'll rely on `initializeStream` getting us a stream, but `connect` uses it only ONCE at start.
    
    // WORKAROUND: For this iteration, if video is toggled, we just handle the UI side (UserVideo).
    // The Audio track sent to OpenAI should remain active if possible.
    // BUT `initializeStream` stops old tracks. This will kill the call audio.
    
    // Better approach: Add/Remove Video Track exclusively.
    if (streamRef.current) {
        if (newVideoState) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } });
                const videoTrack = videoStream.getVideoTracks()[0];
                streamRef.current.addTrack(videoTrack);
            } catch(e) { console.error(e); setIsVideoEnabled(false); }
        } else {
            streamRef.current.getVideoTracks().forEach(t => {
                t.stop();
                streamRef.current?.removeTrack(t);
            });
        }
    } else {
       // No stream? Init.
       await initializeStream(newVideoState);
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      setShowPauseModal(false);
      // Realtime connection stays active, just logic pause? 
      // Or we could mute? For now, just UI pause.
    } else {
      // Pause
      setIsPaused(true);
      setShowPauseModal(true);
    }
  };

  const handleEndInterview = async (skipConfirmation = false) => {
    if (!skipConfirmation && !confirm('Are you sure you want to end this interview?')) {
      return;
    }

    disconnect();
    stopStream();
    setIsPaused(false);
    setShowPauseModal(false);
    setIsVideoEnabled(false);

    await fetch(`/api/interview/${interviewId}/end`, { method: 'POST' });
    setShowCompletionModal(true);
  };

  const handleViewResults = () => {
    setShowCompletionModal(false);
    router.push(`/interview/${interviewId}/summary`);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-dialogue-coral/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-morality-teal/5 blur-3xl" />
      </div>

      <InterviewHeader
        jobTitle={jobTitle}
        companyName={companyName}
        interviewType={interviewType}
        difficulty={difficulty}
        timeRemaining={timeRemaining}
      />

      {/* Main Orb Interface - Centered and Immersive */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-24">
        <div className="w-full max-w-2xl bg-white/30 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-2xl shadow-black/5 p-8 sm:p-12 transition-all duration-500 hover:shadow-black/10 hover:bg-white/40">
          <div className="flex flex-col items-center justify-center space-y-12">
            {!hasStarted ? (
              <StartInterviewScreen
                onStartInterview={handleStartInterview}
                browserCompatibility={browserCompatibility}
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
              />
            ) : (
              <>
                <div className="relative transform scale-110 transition-transform duration-500">
                  {/* Floor Reflection */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 blur-xl rounded-full" />
                  <VoiceRecordingOrb state={state} isPaused={isPaused} />
                </div>
                <StatusMessage state={state} isPaused={isPaused} isFirstQuestion={!conversations.length} />
              </>
            )}
          </div>
        </div>
      </div>

      <ChatOverlay
        open={showChat}
        conversations={conversations}
        state={state}
        isPaused={isPaused}
        onClose={() => setShowChat(false)}
      />

      {/* User Video Feed - Positioned in bottom-right corner */}
      {hasStarted && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-30 w-48 sm:w-64 aspect-video transition-all duration-300 ease-in-out">
          <UserVideo 
            stream={streamRef.current} 
            isEnabled={isVideoEnabled}
            className="w-full h-full rounded-xl border border-white/20 shadow-2xl bg-black"
          />
        </div>
      )}

      <InterviewControls
        onEndInterview={handleEndInterview}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        showChat={showChat}
        onToggleChat={() => setShowChat(!showChat)}
        state={state}
        isVideoEnabled={isVideoEnabled}
        onToggleVideo={handleToggleVideo}
      />

      <PauseModal
        open={showPauseModal}
        onResume={handleTogglePause}
        onEndInterview={() => {
          setShowPauseModal(false);
          handleEndInterview(true);
        }}
      />

      <CompletionModal
        open={showCompletionModal}
        onViewResults={handleViewResults}
      />
    </div>
  );
}