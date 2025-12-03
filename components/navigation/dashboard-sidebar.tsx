'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { Home, History, Plus, Settings, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useSidebar } from './sidebar-context';
import type { SubscriptionStatus } from '@/types/user';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/new-interview', label: 'New Interview', icon: Plus },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const isPro = subscription?.plan === 'pro';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-black/5 flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-16 flex items-center border-b border-black/5 px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        <Link href="/dashboard" className="flex items-center gap-2 group">
          {collapsed ? (
            <div className="font-serif text-xl font-bold text-ethics-black">IP</div>
          ) : (
            <div className="font-serif text-xl font-medium tracking-tight group-hover:opacity-80 transition-opacity text-ethics-black">
              Interview Prep
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-8 w-8 p-0', collapsed && 'hidden')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          // Active state rules:
          // - Dashboard: /dashboard and active interview pages (but not summaries)
          // - History: /history and interview summary pages
          const isInterviewPage = pathname?.startsWith('/interview/');
          const isSummaryPage = isInterviewPage && pathname?.endsWith('/summary');

          const isDashboard =
            item.href === '/dashboard' &&
            (pathname === '/dashboard' || (isInterviewPage && !isSummaryPage));

          const isHistory =
            item.href === '/history' &&
            (pathname === '/history' || isSummaryPage);

          const isExact = pathname === item.href;
          const isActive = isDashboard || isHistory || isExact;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  'hover:bg-warm-sand/50',
                  isActive && 'bg-ethics-black text-white hover:bg-ethics-black/90',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-ethics-black/70')} />
                {!collapsed && (
                  <span className={cn(
                    'font-medium text-sm',
                    isActive ? 'text-white' : 'text-ethics-black/80'
                  )}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Subscription Status */}
      {subscription && !collapsed && (
        <div className="px-3 pb-2">
          <Link href="/pricing">
            <div className={cn(
              'px-3 py-2 rounded-lg transition-all',
              isPro 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200' 
                : 'bg-warm-sand/50 border border-black/5 hover:border-black/10'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Crown className={cn('h-4 w-4', isPro ? 'text-amber-600' : 'text-ethics-black/50')} />
                <span className={cn('text-xs font-semibold uppercase tracking-wider', isPro ? 'text-amber-800' : 'text-ethics-black/60')}>
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </span>
              </div>
              {!isPro && (
                <div className="text-xs text-ethics-black/60">
                  {subscription.interviewsUsed}/{subscription.interviewsLimit} interviews
                </div>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Collapsed subscription indicator */}
      {subscription && collapsed && (
        <div className="px-2 pb-2">
          <Link href="/pricing">
            <div className={cn(
              'p-2 rounded-lg flex justify-center',
              isPro ? 'bg-amber-50' : 'bg-warm-sand/50'
            )}>
              <Crown className={cn('h-5 w-5', isPro ? 'text-amber-600' : 'text-ethics-black/40')} />
            </div>
          </Link>
        </div>
      )}

      {/* User Section */}
      <div className={cn(
        'border-t border-black/5 p-3',
        collapsed && 'flex justify-center'
      )}>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}

