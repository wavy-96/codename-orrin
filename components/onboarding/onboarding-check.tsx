'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      // If we've already confirmed onboarding in this session, don't re-check on every tab change
      if (typeof window !== 'undefined') {
        const cached = window.sessionStorage.getItem('onboarding_complete');
        if (cached === 'true') {
          setIsChecking(false);
          return;
        }
      }

      // Skip check for onboarding page and test pages
      if (
        pathname === '/onboarding' || 
        pathname?.includes('/onboarding') ||
        pathname === '/test-onboarding'
      ) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/user/profile');
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response from profile API:', text.substring(0, 200));
          setIsChecking(false);
          return;
        }
        
        const profile = await response.json();

        if (!profile || !profile.onboarding_completed) {
          router.push('/onboarding');
          return;
        }

        // Cache success so subsequent navigations are instant
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('onboarding_complete', 'true');
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-sand">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-ethics-black mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

