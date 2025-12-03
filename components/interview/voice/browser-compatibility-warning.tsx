'use client';

import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { checkBrowserCompatibility, getBrowserInfo } from '@/lib/utils/browser-compatibility';

interface BrowserCompatibilityWarningProps {
  onStartInterview: () => void;
}

export function BrowserCompatibilityWarning({ onStartInterview }: BrowserCompatibilityWarningProps) {
  const browserCompatibility = checkBrowserCompatibility();
  const browser = getBrowserInfo();

  if (browserCompatibility.isSupported) {
    return null;
  }

  return (
    <div className="text-center space-y-4 max-w-md">
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
        <h2 className="text-xl font-bold text-destructive">Browser Not Fully Supported</h2>
        <p className="text-sm text-muted-foreground">
          Your browser is missing some required features for voice interviews:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {browserCompatibility.unsupportedFeatures.map((feature, idx) => (
            <li key={idx}>{feature}</li>
          ))}
        </ul>
        {browserCompatibility.recommendedBrowser && (
          <p className="text-sm font-medium text-foreground mt-3">
            {browserCompatibility.recommendedBrowser}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Detected: {browser.name}{browser.version ? ` ${browser.version}` : ''} {browser.isMobile ? '(Mobile)' : '(Desktop)'}
        </p>
      </div>
      <Button
        size="lg"
        onClick={onStartInterview}
        className="touch-manipulation"
        disabled={!browserCompatibility.getUserMedia || !browserCompatibility.audioContext}
      >
        <Play className="mr-2 h-5 w-5" />
        Try Anyway
      </Button>
    </div>
  );
}

