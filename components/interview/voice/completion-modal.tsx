'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, TrendingUp } from 'lucide-react';

interface CompletionModalProps {
  open: boolean;
  onViewResults: () => void;
}

export function CompletionModal({ open, onViewResults }: CompletionModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
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
              onClick={onViewResults}
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              View Score & Analytics
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

