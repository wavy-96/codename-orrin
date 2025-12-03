'use client';

import { useEffect, useRef } from 'react';
import { Video, VideoOff } from 'lucide-react';

interface UserVideoProps {
  stream: MediaStream | null;
  isEnabled: boolean;
  className?: string;
}

export function UserVideo({ stream, isEnabled, className = '' }: UserVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && isEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error('[Video] Error playing video:', err);
      });
    } else if (videoRef.current && !isEnabled) {
      videoRef.current.srcObject = null;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, isEnabled]);

  if (!isEnabled) {
    return (
      <div className={`relative bg-ethics-black/10 rounded-lg flex items-center justify-center ${className}`}>
        <VideoOff className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden bg-ethics-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video for natural self-view
      />
      {/* Video indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs text-white font-medium">LIVE</span>
      </div>
    </div>
  );
}

