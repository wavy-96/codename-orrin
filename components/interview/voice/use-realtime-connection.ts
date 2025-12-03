'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseOpenAIRealtimeProps {
  interviewId: string;
  onMessage?: (role: 'user' | 'interviewer', text: string) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => void;
}

export function useOpenAIRealtime({ interviewId, onMessage, onStatusChange }: UseOpenAIRealtimeProps) {
  const [isConnected, setIsConnected] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const msRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const isRespondingRef = useRef<boolean>(false);
  const lastTranscriptRef = useRef<string>('');

  const connectWebRTC = async (ephemeralKey: string, existingStream?: MediaStream) => {
    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Audio Output
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      
      pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
      };

      // Add Microphone
      let ms = existingStream;
      if (!ms) {
         ms = await navigator.mediaDevices.getUserMedia({ audio: true });
         msRef.current = ms; // Only manage cleanup if we created it
      }
      
      // Add audio track to PC
      const audioTrack = ms.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, ms);
      } else {
        console.error("No audio track found in stream");
      }

      // Data Channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      
      dc.onopen = () => {
          setIsConnected(true);
          onStatusChange?.('connected');
          
          // Trigger initial greeting from AI
          setTimeout(() => {
            const greetingMessage = {
              type: 'response.create',
              response: {
                modalities: ['audio', 'text'],
                instructions: 'Start the interview with your introduction and first question.'
              }
            };
            dc.send(JSON.stringify(greetingMessage));
          }, 500);
      };

      dc.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data);
            handleRealtimeEvent(event);
          } catch (err) {
            console.error("Error parsing event:", err);
          }
      };

      // Negotiation
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-10-01";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
          method: "POST",
          body: offer.sdp,
          headers: {
              "Authorization": `Bearer ${ephemeralKey}`,
              "Content-Type": "application/sdp"
          },
      });

      if (!sdpResponse.ok) throw new Error("SDP Error: " + await sdpResponse.text());

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
          type: "answer",
          sdp: answerSdp,
      });
    } catch (e) {
      console.error("WebRTC Connection Error:", e);
      onStatusChange?.('error');
    }
  };

  const connect = useCallback(async (existingStream?: MediaStream) => {
    try {
      onStatusChange?.('connecting');
      
      // 1. Get Ephemeral Token
      const sessionRes = await fetch(`/api/interview/${interviewId}/session`, { method: 'POST' });
      if (!sessionRes.ok) throw new Error('Failed to get session token');
      const { client_secret } = await sessionRes.json();

      await connectWebRTC(client_secret.value, existingStream);

    } catch (e) {
      console.error(e);
      onStatusChange?.('error');
    }
  }, [interviewId]); // Removed onStatusChange dependency loop

  const handleRealtimeEvent = async (event: any) => {
      console.log('[Realtime Event]', event.type, event);
      
      // Track response state to prevent overlapping responses
      if (event.type === 'response.created') {
          isRespondingRef.current = true;
      }
      
      // Handle interviewer transcripts - only use audio_transcript.done to avoid duplicates
      if (event.type === 'response.audio_transcript.done') {
          const transcript = event.transcript?.trim();
          if (transcript && transcript.length > 0 && transcript !== lastTranscriptRef.current) {
            lastTranscriptRef.current = transcript;
            onMessage?.('interviewer', transcript);
            saveTranscript('interviewer', transcript);
          }
      }
      
      // Handle user speech transcription
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = event.transcript?.trim();
          // Only process non-empty user transcripts with meaningful content
          if (transcript && transcript.length > 2) {
            console.log('[Realtime] User said:', transcript);
            onMessage?.('user', transcript);
            saveTranscript('user', transcript);
          } else {
            console.log('[Realtime] Ignoring empty/short user transcript:', transcript);
          }
      }
      
      // Status updates
      if (event.type === 'input_audio_buffer.speech_started') {
          onStatusChange?.('listening');
      }
      if (event.type === 'response.audio.delta' || event.type === 'response.audio_transcript.delta') { 
          onStatusChange?.('speaking');
      }
      if (event.type === 'response.done') {
          isRespondingRef.current = false;
          onStatusChange?.('idle');
      }
      
      // Handle errors
      if (event.type === 'error') {
          console.error('[Realtime Error]', event.error);
      }
  };

  const saveTranscript = async (role: 'user' | 'interviewer', message: string) => {
      try {
        await fetch(`/api/interview/${interviewId}/transcript`, {
            method: 'POST',
            body: JSON.stringify({ role, message })
        });
      } catch (e) {
        console.error("Failed to save transcript:", e);
      }
  };

  const disconnect = useCallback(() => {
      if (pcRef.current) pcRef.current.close();
      if (msRef.current) msRef.current.getTracks().forEach(t => t.stop());
      if (audioElRef.current) {
        audioElRef.current.srcObject = null;
        audioElRef.current.remove();
      }
      setIsConnected(false);
      onStatusChange?.('idle');
  }, []); // Removed onStatusChange dependency loop

  // Initial cleanup
  useEffect(() => {
      return () => disconnect();
  }, []);

  return { connect, disconnect, isConnected };
}

