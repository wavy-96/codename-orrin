'use client';

import { Button } from '@/components/ui/button';
import { Play, Mic } from 'lucide-react';
import { BrowserCompatibilityWarning } from './browser-compatibility-warning';
import { checkBrowserCompatibility } from '@/lib/utils/browser-compatibility';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface StartInterviewScreenProps {
  onStartInterview: () => void;
  browserCompatibility: ReturnType<typeof checkBrowserCompatibility> | null;
  onVoiceChange: (voice: string) => void;
  selectedVoice: string;
}

export function StartInterviewScreen({ 
  onStartInterview, 
  browserCompatibility,
  onVoiceChange,
  selectedVoice
}: StartInterviewScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 max-w-md mx-auto">
      {browserCompatibility && !browserCompatibility.isSupported ? (
        <BrowserCompatibilityWarning onStartInterview={onStartInterview} />
      ) : (
        <>
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-serif font-medium text-ethics-black">Ready to Start?</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Ensure your microphone is ready. You can pause the session at any time.
            </p>
          </div>

          <div className="w-full space-y-3">
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center block">
              Select Interviewer Voice
            </Label>
            <Select value={selectedVoice} onValueChange={onVoiceChange}>
              <SelectTrigger className="w-full h-12 bg-white/50 border-black/10 backdrop-blur-sm">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nova">Nova (Natural, Calm)</SelectItem>
                <SelectItem value="shimmer">Shimmer (Warm, Engaging)</SelectItem>
                <SelectItem value="alloy">Alloy (Neutral, Balanced)</SelectItem>
                <SelectItem value="echo">Echo (Deep, Steady)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size="lg"
            onClick={onStartInterview}
            className="w-full h-14 text-lg bg-ethics-black text-white hover:bg-ethics-black/90 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-xl touch-manipulation"
          >
            <Play className="mr-2 h-6 w-6" />
            Start Session
          </Button>
        </>
      )}
    </div>
  );
}

