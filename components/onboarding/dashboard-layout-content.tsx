'use client';

import { usePathname } from 'next/navigation';
import { DashboardSidebar } from '@/components/navigation/dashboard-sidebar';
import { SidebarProvider, useSidebar } from '@/components/navigation/sidebar-context';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-warm-sand">
      <DashboardSidebar />
      <main className={cn(
        'min-h-screen transition-all duration-300',
        collapsed ? 'ml-16' : 'ml-64'
      )}>
        {children}
      </main>
    </div>
  );
}

export function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboardingPage = pathname === '/onboarding';
  const isInterviewPage = pathname?.startsWith('/interview/') && !pathname?.endsWith('/summary');

  // Don't show sidebar during interview sessions (for focus)
  if (isOnboardingPage || isInterviewPage) {
    return (
      <div className="min-h-screen bg-warm-sand">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}

