'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pause, Play, Square } from 'lucide-react';

interface PauseModalProps {
  open: boolean;
  onResume: () => void;
  onEndInterview: () => void;
}

export function PauseModal({ open, onResume, onEndInterview }: PauseModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
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
              onClick={onResume}
            >
              <Play className="mr-2 h-5 w-5" />
              Resume Interview
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="w-full"
              onClick={onEndInterview}
            >
              <Square className="mr-2 h-5 w-5" />
              End Interview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

