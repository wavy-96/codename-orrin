'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pause, Play, Square, MessageSquare, X, Trophy, TrendingUp } from 'lucide-react';
import { TranscriptionDisplay } from './transcription-display';
import { InterviewControls } from './interview-controls';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VoiceInterfaceProps {
  interviewId: string;
  durationMinutes?: number; // Interview duration in minutes
  jobTitle?: string;
  companyName?: string;
  interviewType?: string;
  difficulty?: string;
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

export function VoiceInterface({ 
  interviewId, 
  durationMinutes = 5,
  jobTitle,
  companyName,
  interviewType,
  difficulty
}: VoiceInterfaceProps) {
  const router = useRouter();
  const [state, setState] = useState<ConversationState>('idle');
  const [isPaused, setIsPaused] = useState(false); // User manually paused the interview
  const [isTimerPaused, setIsTimerPaused] = useState(false); // Timer paused during processing (internal)
  const [conversations, setConversations] = useState<Array<{ role: 'user' | 'interviewer'; message: string }>>([]);
  const [isFirstQuestion, setIsFirstQuestion] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60); // Convert minutes to seconds
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null); // Track when paused
  const [totalPausedTime, setTotalPausedTime] = useState(0); // Track total paused duration
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const totalDuration = durationMinutes * 60; // Total duration in seconds

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadCheckRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const hasSpeechRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false); // Prevent duplicate initialization

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    // Initialize microphone stream once and keep it open, then start first question
    const init = async () => {
      await initializeMicrophone();
      // Start with first question after mic is ready
      if (isFirstQuestion) {
        handleGetQuestion();
      }
    };
    init();

    return () => {
      // Cleanup
      stopVAD();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Timer effect - countdown with proper pause support
  useEffect(() => {
    if (!interviewStartTime) return;

    // Handle pausing
    if (isPaused || isTimerPaused) {
      if (!pausedAt) {
        setPausedAt(Date.now());
      }
      return;
    }

    // Handle resuming - add paused time to total
    if (pausedAt) {
      const pauseDuration = Math.floor((Date.now() - pausedAt) / 1000);
      setTotalPausedTime(prev => prev + pauseDuration);
      setPausedAt(null);
    }

    const interval = setInterval(() => {
      const totalElapsed = Math.floor((Date.now() - interviewStartTime) / 1000);
      const actualElapsed = totalElapsed - totalPausedTime;
      const remaining = Math.max(0, totalDuration - actualElapsed);
      setTimeRemaining(remaining);

      // Auto-end interview when time is up
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeRemaining(0);
        // Show modal immediately, then end interview
        setShowCompletionModal(true);
        handleEndInterview(true).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewStartTime, isPaused, isTimerPaused, totalDuration, totalPausedTime, pausedAt]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGetQuestion = async () => {
    try {
      // Set interview start time on first question
      if (isFirstQuestion && interviewStartTime === null) {
        setInterviewStartTime(Date.now());
      }

      setState('processing');
      const response = await fetch(`/api/interview/${interviewId}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isFirstQuestion,
          timeRemainingSeconds: timeRemaining, // Pass time remaining in seconds
        }),
      });

      if (!response.ok) throw new Error('Failed to get question');

      const data = await response.json();
      setConversations(prev => [...prev, { role: 'interviewer', message: data.message }]);
      setIsFirstQuestion(false);

      // Play TTS (will auto-start listening after)
      await playTextToSpeech(data.message, true);
    } catch (error) {
      console.error('Error getting question:', error);
      setState('idle');
      // Start VAD even if getting question fails
      if (!isPaused && streamRef.current && analyserRef.current) {
        setTimeout(() => {
          if (!isPaused && streamRef.current && analyserRef.current) {
            startVAD();
          }
        }, 300);
      }
    }
  };

  const playTextToSpeech = async (text: string, autoStartListening = true) => {
    try {
      setState('speaking');
      // Stop VAD while AI is speaking
      stopVAD();
      
      const response = await fetch(`/api/interview/${interviewId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' }),
      });

      if (!response.ok) throw new Error('Failed to generate speech');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Mobile browsers require user interaction for audio playback
      // Set volume and preload to help with mobile compatibility
      audio.volume = 1.0;
      audio.preload = 'auto';

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setState('idle');
          
          // Always automatically resume VAD after interviewer finishes speaking
          if (autoStartListening && !isPaused) {
            // Use a slightly longer delay to ensure audio context is ready
            setTimeout(() => {
              // Double-check paused state and stream availability
              if (!isPaused && streamRef.current && analyserRef.current) {
                // Resume AudioContext if suspended (common on mobile)
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  audioContextRef.current.resume().then(() => {
                    startVAD();
                  }).catch((err) => {
                    console.error('Error resuming audio context:', err);
                    startVAD();
                  });
                } else {
                  startVAD();
                }
              } else {
                // Try to reinitialize if needed
                if (!streamRef.current || !analyserRef.current) {
                  initializeMicrophone().then(() => {
                    setTimeout(() => {
                      if (!isPaused && streamRef.current && analyserRef.current) {
                        startVAD();
                      }
                    }, 500);
                  });
                }
              }
            }, 500); // Increased delay to ensure everything is ready
          }
          resolve();
        };
        audio.onerror = (err) => {
          console.error('Audio playback error:', err);
          URL.revokeObjectURL(audioUrl);
          setState('idle');
          // Resume VAD even on error if not paused
          if (autoStartListening && !isPaused && streamRef.current) {
            setTimeout(() => {
              if (!isPaused && streamRef.current && analyserRef.current) {
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  audioContextRef.current.resume().then(() => {
                    startVAD();
                  }).catch(() => startVAD());
                } else {
                  startVAD();
                }
              }
            }, 300);
          }
          reject(new Error('Audio playback failed'));
        };
        
        // Attempt to play audio
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Audio started playing successfully
              console.log('[TTS] Audio playback started');
            })
            .catch((err) => {
              console.error('[TTS] Audio play failed:', err);
              URL.revokeObjectURL(audioUrl);
              setState('idle');
              // Resume VAD even if play fails
              if (autoStartListening && !isPaused && streamRef.current) {
                setTimeout(() => {
                  if (!isPaused && streamRef.current && analyserRef.current) {
                    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                      audioContextRef.current.resume().then(() => {
                        startVAD();
                      }).catch(() => startVAD());
                    } else {
                      startVAD();
                    }
                  }
                }, 300);
              }
              reject(err);
            });
        }
      });
    } catch (error) {
      console.error('Error playing TTS:', error);
      setState('idle');
      // Resume VAD on error if not paused
      if (autoStartListening && !isPaused && streamRef.current) {
        setTimeout(() => {
          if (!isPaused && streamRef.current && analyserRef.current) {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().then(() => {
                startVAD();
              }).catch(() => startVAD());
            } else {
              startVAD();
            }
          }
        }, 300);
      }
    }
  };

  // Initialize microphone stream once and keep it open
  const initializeMicrophone = async () => {
    try {
      if (streamRef.current) {
        // Check if stream is still active
        const tracks = streamRef.current.getTracks();
        const activeTracks = tracks.filter(track => track.readyState === 'live');
        if (activeTracks.length > 0 && audioContextRef.current && analyserRef.current) {
          // Stream is still active, just resume AudioContext if needed
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          return; // Already initialized and active
        }
        // Stream exists but is not active, clean it up
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Initialize or resume audio context for VAD
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        audioContext = new AudioContext();
        audioContextRef.current = audioContext;
      }
      
      // Resume AudioContext if suspended (common on mobile after pause)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 4096; // Higher FFT size for better frequency resolution
      analyser.smoothingTimeConstant = 0.2; // Lower for more responsive detection
    } catch (error) {
      console.error('Error initializing microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  // Voice Activity Detection - continuously monitors for speech
  const startVAD = () => {
    if (!streamRef.current || !analyserRef.current || isPaused) {
      console.log('[VAD] Cannot start - stream:', !!streamRef.current, 'analyser:', !!analyserRef.current, 'paused:', isPaused);
      return;
    }

    console.log('[VAD] Starting voice activity detection...');
    stopVAD(); // Stop any existing VAD

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    
    // Improved VAD parameters with adaptive threshold
    let adaptiveThreshold = 8; // Start with lower threshold
    const MIN_THRESHOLD = 5;
    const MAX_THRESHOLD = 20;
    const SILENCE_DURATION = 2000; // Increased to 2 seconds for better capture
    const MIN_SPEECH_DURATION = 500; // Increased minimum speech duration
    const BACKGROUND_NOISE_SAMPLES = 30; // Samples to calculate background noise
    
    // Volume smoothing
    const volumeHistory: number[] = [];
    const HISTORY_SIZE = 5;
    let backgroundNoiseLevel = 0;
    let noiseSamplesCollected = 0;

    const checkVAD = () => {
      if (!streamRef.current || !analyserRef.current || isPaused) {
        return;
      }

      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(frequencyData);
      
      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const volume = rms * 100;
      
      // Calculate energy in speech frequency range (300-3400 Hz)
      let speechEnergy = 0;
      const sampleRate = analyser.context.sampleRate;
      const nyquist = sampleRate / 2;
      for (let i = 0; i < frequencyData.length; i++) {
        const freq = (i / frequencyData.length) * nyquist;
        if (freq >= 300 && freq <= 3400) {
          speechEnergy += frequencyData[i];
        }
      }
      speechEnergy = speechEnergy / frequencyData.length;

      // Smooth volume using moving average
      volumeHistory.push(volume);
      if (volumeHistory.length > HISTORY_SIZE) {
        volumeHistory.shift();
      }
      const smoothedVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;

      // Calibrate background noise level when not recording
      if (!isRecordingRef.current && noiseSamplesCollected < BACKGROUND_NOISE_SAMPLES) {
        backgroundNoiseLevel = (backgroundNoiseLevel * noiseSamplesCollected + volume) / (noiseSamplesCollected + 1);
        noiseSamplesCollected++;
        if (noiseSamplesCollected === BACKGROUND_NOISE_SAMPLES) {
          adaptiveThreshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, backgroundNoiseLevel * 2.5));
        }
      }

      const now = Date.now();
      
      // Use both volume and speech energy for better detection
      const isSpeech = smoothedVolume > adaptiveThreshold || (speechEnergy > 30 && smoothedVolume > adaptiveThreshold * 0.7);

      if (isSpeech) {
        // Speech detected
        lastSpeechTimeRef.current = now;
        
        if (!isRecordingRef.current) {
          // Start recording when speech is first detected
          console.log(`[VAD] Speech detected (volume: ${smoothedVolume.toFixed(1)}, energy: ${speechEnergy.toFixed(1)}) - Starting recording`);
          speechStartTimeRef.current = now;
          startRecording();
        } else if (silenceStartRef.current) {
          // Speech resumed after silence, reset silence timer
          console.log('[VAD] Speech resumed after silence');
          silenceStartRef.current = null;
        }
      } else if (isRecordingRef.current) {
        // Silence detected while recording
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
        } else {
          const silenceDuration = now - silenceStartRef.current;
          const speechDuration = lastSpeechTimeRef.current && speechStartTimeRef.current 
            ? lastSpeechTimeRef.current - speechStartTimeRef.current 
            : 0;

          // Stop recording if:
          // 1. Silence duration exceeds threshold AND
          // 2. We've captured at least minimum speech duration
          if (silenceDuration > SILENCE_DURATION && speechDuration > MIN_SPEECH_DURATION) {
            stopRecording();
            return;
          }
        }
      }

      // Continue VAD monitoring
      vadCheckRef.current = requestAnimationFrame(checkVAD);
    };

    setState('idle'); // Ready to listen
    console.log('[VAD] VAD loop started - listening for speech...');
    vadCheckRef.current = requestAnimationFrame(checkVAD);
  };

  const stopVAD = () => {
    if (vadCheckRef.current !== null) {
      cancelAnimationFrame(vadCheckRef.current);
      vadCheckRef.current = null;
    }
    // Stop recording if active
    if (isRecordingRef.current) {
      stopRecording();
    }
    silenceStartRef.current = null;
    hasSpeechRef.current = false;
    speechStartTimeRef.current = null;
    lastSpeechTimeRef.current = null;
  };

  // Start recording when speech is detected
  const startRecording = () => {
    if (!streamRef.current || isRecordingRef.current) {
      console.log('[Recording] Cannot start - stream:', !!streamRef.current, 'already recording:', isRecordingRef.current);
      return;
    }
    console.log('[Recording] Starting recording...');

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Reset recording state
        isRecordingRef.current = false;
        hasSpeechRef.current = false;
        silenceStartRef.current = null;
        speechStartTimeRef.current = null;
        lastSpeechTimeRef.current = null;
        
        // Only process if we have audio data
        if (audioBlob.size > 0) {
          await handleSendAudio(audioBlob);
        } else {
          // No audio captured, resume VAD
          setState('idle');
          if (!isPaused) {
            startVAD();
          }
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      isRecordingRef.current = true;
      hasSpeechRef.current = true;
      setState('listening');

      // Fallback: Auto-stop after 30 seconds maximum
      const maxDurationTimer = setTimeout(() => {
        if (isRecordingRef.current && mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);

      // Store timer to clear if manually stopped
      (mediaRecorderRef.current as any).maxDurationTimer = maxDurationTimer;
    } catch (error) {
      console.error('Error starting recording:', error);
      isRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[Recording] Stopping recording...');
      // Clear max duration timer if exists
      if ((mediaRecorderRef.current as any).maxDurationTimer) {
        clearTimeout((mediaRecorderRef.current as any).maxDurationTimer);
      }
      mediaRecorderRef.current.stop();
    }
    isRecordingRef.current = false;
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    try {
      setState('processing');
      stopVAD(); // Stop VAD while processing
      
      // Pause timer during processing to not waste user's time (but don't affect VAD)
      setIsTimerPaused(true);

      // Convert to text
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const sttResponse = await fetch(`/api/interview/${interviewId}/stt`, {
        method: 'POST',
        body: formData,
      });

      if (!sttResponse.ok) throw new Error('Failed to transcribe');

      const { text } = await sttResponse.json();
      
      // Only add conversation if we got meaningful text
      if (text && text.trim().length > 0) {
        setConversations(prev => [...prev, { role: 'user', message: text }]);

        // Get interviewer response - pass time remaining
        const conversationResponse = await fetch(`/api/interview/${interviewId}/conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userMessage: text, 
            isFirstQuestion: false,
            timeRemainingSeconds: timeRemaining, // Pass time remaining in seconds
          }),
        });

        if (!conversationResponse.ok) throw new Error('Failed to get response');

        const data = await conversationResponse.json();
        
        // Check if interview should be auto-ended (non-serious response detected)
        if (data.shouldEndInterview) {
          setConversations(prev => [...prev, { role: 'interviewer', message: data.message }]);
          // Resume timer briefly to play the final message
          setIsTimerPaused(false);
          await playTextToSpeech(data.message, true);
          // End interview after message plays
          setTimeout(() => {
            handleEndInterview(true);
          }, 2000);
          return;
        }

        setConversations(prev => [...prev, { role: 'interviewer', message: data.message }]);

        // Resume timer before playing TTS (interviewer speaking is part of interview time)
        setIsTimerPaused(false);

        // Play TTS (will auto-resume VAD after)
        await playTextToSpeech(data.message, true);
      } else {
        // No meaningful text, resume timer and VAD
        setIsTimerPaused(false);
        setState('idle');
        if (!isPaused && streamRef.current && analyserRef.current) {
          setTimeout(() => {
            if (!isPaused && streamRef.current && analyserRef.current) {
              startVAD();
            }
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error sending audio:', error);
      // Resume timer on error
      setIsTimerPaused(false);
      setState('idle');
      // Auto-resume VAD on error
      if (!isPaused && streamRef.current && analyserRef.current) {
        setTimeout(() => {
          if (!isPaused && streamRef.current && analyserRef.current) {
            startVAD();
          }
        }, 500);
      }
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setShowPauseModal(false);
      
      // Resume AudioContext if suspended (common on mobile)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch((err) => {
          console.error('Error resuming audio context:', err);
        });
      }
      
      if (audioRef.current && state === 'speaking') {
        audioRef.current.play().catch((err) => {
          console.error('Error resuming audio playback:', err);
        });
      } else if (state === 'idle') {
        // Reinitialize microphone if needed (stream might have been stopped)
        if (!streamRef.current || !analyserRef.current) {
          initializeMicrophone().then(() => {
            setTimeout(() => {
              if (!isPaused && streamRef.current && analyserRef.current) {
                startVAD();
              }
            }, 500);
          });
        } else {
          // Resume VAD when resuming from pause
          setTimeout(() => {
            if (!isPaused && streamRef.current && analyserRef.current) {
              // Ensure AudioContext is resumed
              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().then(() => {
                  startVAD();
                }).catch(() => startVAD());
              } else {
                startVAD();
              }
            }
          }, 300);
        }
      }
    } else {
      setIsPaused(true);
      setShowPauseModal(true);
      stopVAD(); // Stop VAD when pausing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Note: We don't stop the stream on pause, just stop VAD
      // This allows us to resume quickly without re-requesting permissions
    }
  };

  const handleEndInterview = async (skipConfirmation = false) => {
    if (!skipConfirmation && !confirm('Are you sure you want to end this interview?')) {
      return;
    }

    try {
      // Stop all audio and VAD
      stopVAD();
      setIsPaused(false);
      setShowPauseModal(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // End interview
      await fetch(`/api/interview/${interviewId}/end`, {
        method: 'POST',
      });
      
      // Show completion modal instead of redirecting
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Error ending interview:', error);
    }
  };

  const handleViewResults = () => {
    setShowCompletionModal(false); // Close modal first
    router.push(`/interview/${interviewId}/summary`);
  };


  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-2 sm:p-4 space-y-4 relative">
      {/* Header with Interview Info, Timer and Controls */}
      <div className="flex justify-between items-center mb-2 z-20 border-b pb-3">
        {/* Interview Info */}
        <div className="flex-1">
          {jobTitle && companyName && (
            <>
              <h1 className="text-lg sm:text-xl font-bold">
                {jobTitle} at {companyName}
              </h1>
              {interviewType && difficulty && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {interviewType} • {difficulty}
                </p>
              )}
            </>
          )}
        </div>

        {/* Timer and Controls */}
        <div className="flex items-center gap-3">
          {/* Timer Display */}
          <div className={`text-lg font-mono font-semibold ${
            timeRemaining <= 60 ? 'text-red-600' : timeRemaining <= 120 ? 'text-orange-600' : 'text-foreground'
          }`}>
            {formatTime(timeRemaining)}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowChat(!showChat)}
              className="touch-manipulation"
            >
              {showChat ? (
                <>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Hide Chat</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Show Chat</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTogglePause}
              disabled={state === 'processing'}
              className="touch-manipulation"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Pause</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleEndInterview()}
              disabled={state === 'processing'}
              className="touch-manipulation"
            >
              <Square className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">End</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Orb Interface - Always visible */}
      <Card className="flex-1 flex items-center justify-center min-h-[400px]">
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-8">
          {/* Voice Recording Indicator - Main Focus */}
          <div className="relative">
            <div
              className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full transition-all duration-300 ${
                state === 'listening' || state === 'speaking'
                  ? 'shadow-lg'
                  : ''
              } ${
                state === 'listening'
                  ? 'bg-gradient-to-br from-blue-400 via-blue-300 to-white shadow-blue-400/50'
                  : state === 'idle' && !isPaused
                  ? 'bg-gradient-to-br from-blue-200 via-blue-100 to-white shadow-md'
                  : state === 'processing'
                  ? 'bg-gradient-to-br from-yellow-200 via-yellow-100 to-white animate-pulse'
                  : state === 'speaking'
                  ? 'bg-gradient-to-br from-purple-200 via-purple-100 to-white shadow-purple-400/50'
                  : 'bg-gradient-to-br from-gray-200 via-gray-100 to-white'
              }`}
              style={{
                background: state === 'listening'
                  ? 'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.8), rgba(147, 197, 253, 0.6), rgba(255, 255, 255, 0.9))'
                  : state === 'idle' && !isPaused
                  ? 'radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 0.4), rgba(191, 219, 254, 0.3), rgba(255, 255, 255, 0.8))'
                  : state === 'processing'
                  ? 'radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.4), rgba(254, 240, 138, 0.3), rgba(255, 255, 255, 0.8))'
                  : state === 'speaking'
                  ? 'radial-gradient(circle at 30% 30%, rgba(192, 132, 252, 0.8), rgba(221, 214, 254, 0.6), rgba(255, 255, 255, 0.9))'
                  : 'radial-gradient(circle at 30% 30%, rgba(229, 231, 235, 0.4), rgba(243, 244, 246, 0.3), rgba(255, 255, 255, 0.8))',
                animation: (state === 'listening' || state === 'speaking')
                  ? 'orb-pulse 2s ease-in-out infinite'
                  : 'none',
              }}
            >
              {/* Inner circle for depth */}
              <div
                className="absolute inset-4 rounded-full"
                style={{
                  background: state === 'listening'
                    ? 'radial-gradient(circle at 40% 40%, rgba(37, 99, 235, 0.3), rgba(147, 197, 253, 0.2), transparent)'
                    : state === 'speaking'
                    ? 'radial-gradient(circle at 40% 40%, rgba(147, 51, 234, 0.3), rgba(221, 214, 254, 0.2), transparent)'
                    : 'radial-gradient(circle at 40% 40%, rgba(147, 197, 253, 0.2), rgba(191, 219, 254, 0.1), transparent)',
                }}
              />
            </div>
            
            {/* Pulsing ring when recording or speaking */}
            {(state === 'listening' || state === 'speaking') && (
              <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-75 ${
                state === 'listening' ? 'border-blue-400' : 'border-purple-400'
              }`} />
            )}
          </div>

          <div className="text-sm sm:text-base text-muted-foreground text-center px-4">
            {state === 'idle' && !isPaused && 'Ready to listen... Speak naturally'}
            {state === 'listening' && 'Recording your response...'}
            {state === 'processing' && 'Processing your response...'}
            {state === 'speaking' && 'Interviewer is speaking...'}
            {isPaused && 'Interview paused'}
          </div>
        </CardContent>
      </Card>

      {/* Chat overlay - Toggleable, positioned below timer */}
      {showChat && (
        <div className="absolute left-0 right-0 top-16 bottom-0 bg-background/95 backdrop-blur-sm z-10 rounded-lg border shadow-lg">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Conversation</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowChat(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <TranscriptionDisplay 
              conversations={conversations} 
              state={state}
              isPaused={isPaused}
            />
          </div>
        </div>
      )}

      <InterviewControls
        onEndInterview={handleEndInterview}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />

      {/* Pause Modal */}
      <Dialog open={showPauseModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md border border-border bg-background dark:bg-[#1C1C1C] bg-[#FAF9F7] shadow-2xl p-0 overflow-hidden" showCloseButton={false}>
          <div className="bg-background dark:bg-[#1C1C1C] bg-[#FAF9F7] w-full h-full rounded-lg">
          <DialogHeader className="text-center space-y-4 pt-8 px-6">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Pause className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold text-foreground">
                Interview Paused
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Your interview is paused. The timer has stopped. Click Resume to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 mt-6 px-6 pb-6">
            <Button 
              size="lg" 
              className="w-full"
              onClick={handleTogglePause}
            >
              <Play className="mr-2 h-5 w-5" />
              Resume Interview
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="w-full"
              onClick={() => {
                setShowPauseModal(false);
                handleEndInterview(true); // Skip confirmation since they clicked from modal
              }}
            >
              <Square className="mr-2 h-5 w-5" />
              End Interview
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg border border-border bg-background dark:bg-[#1C1C1C] bg-[#FAF9F7] shadow-2xl p-0 overflow-hidden" showCloseButton={false}>
          <div className="bg-background dark:bg-[#1C1C1C] bg-[#FAF9F7] w-full h-full rounded-lg">
            <DialogHeader className="text-center space-y-4 pt-8 px-6">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-foreground">
                  Great job!
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-muted-foreground max-w-sm mx-auto">
                You've completed your interview session. View your performance and analytics below.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-4 px-6 pb-6 mt-6">
              <Button 
                size="lg" 
                className="w-full h-12 text-base font-semibold"
                onClick={handleViewResults}
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                View Score & Analytics
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

