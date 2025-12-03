'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, Check } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewsUsed?: number;
  interviewsLimit?: number;
}

export function UpgradeModal({ open, onOpenChange, interviewsUsed = 3, interviewsLimit = 3 }: UpgradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPricing = () => {
    onOpenChange(false);
    router.push('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
          <DialogTitle className="text-2xl font-serif">
            You've Used All Free Interviews
          </DialogTitle>
          <DialogDescription className="text-base">
            You've completed {interviewsUsed} of {interviewsLimit} free interviews this month.
            Upgrade to Pro for unlimited practice sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-warm-sand/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Pro includes:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Unlimited interview sessions</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Detailed performance analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Priority support</span>
              </li>
            </ul>
          </div>

          <div className="text-center">
            <span className="text-3xl font-bold">$19.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-ethics-black hover:bg-ethics-black/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Upgrade to Pro'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleViewPricing}
            className="w-full"
          >
            View All Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


