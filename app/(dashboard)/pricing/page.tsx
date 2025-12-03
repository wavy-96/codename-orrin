'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Zap, Crown } from 'lucide-react';
import type { SubscriptionStatus } from '@/types/user';

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/stripe/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setIsCheckingOut(true);
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
      setIsCheckingOut(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsManaging(false);
    }
  };

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-warm-sand p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-ethics-black mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get unlimited interview practice to land your dream job
          </p>
          {canceled && (
            <p className="mt-4 text-amber-600 bg-amber-50 inline-block px-4 py-2 rounded-lg">
              Checkout was canceled. No worries, you can try again anytime.
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-ethics-black" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <Card className={`relative border-2 ${!isPro ? 'border-ethics-black' : 'border-black/10'} bg-white/80 backdrop-blur-md`}>
              {!isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-ethics-black text-white text-xs px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-warm-sand/50 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-ethics-black" />
                </div>
                <CardTitle className="text-2xl font-serif">Free</CardTitle>
                <CardDescription>Get started with interview prep</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>3 interview sessions per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>AI-powered interviewer</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Basic feedback</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Interview history</span>
                  </li>
                </ul>

                {!isPro && subscription && (
                  <div className="text-sm text-muted-foreground mb-4">
                    {subscription.interviewsUsed} of {subscription.interviewsLimit} interviews used this month
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  {!isPro ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative border-2 ${isPro ? 'border-ethics-black' : 'border-black/10'} bg-white/80 backdrop-blur-md shadow-xl`}>
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-ethics-black text-white text-xs px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}
              {!isPro && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4">
                  <Crown className="h-6 w-6 text-amber-600" />
                </div>
                <CardTitle className="text-2xl font-serif">Pro</CardTitle>
                <CardDescription>Unlimited practice for serious prep</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">$19.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="font-medium">Unlimited interview sessions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>AI-powered interviewer</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Detailed performance analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Interview history & insights</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>

                {isPro ? (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isManaging}
                    variant="outline"
                    className="w-full"
                  >
                    {isManaging ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Manage Subscription'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpgrade}
                    disabled={isCheckingOut}
                    className="w-full bg-ethics-black hover:bg-ethics-black/90"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-12 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}


