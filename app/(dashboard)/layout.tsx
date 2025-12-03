import { DashboardNavbar } from '@/components/navigation/dashboard-navbar';
import { OnboardingCheck } from '@/components/onboarding/onboarding-check';
import { DashboardLayoutContent } from '@/components/onboarding/dashboard-layout-content';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingCheck>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </OnboardingCheck>
  );
}

