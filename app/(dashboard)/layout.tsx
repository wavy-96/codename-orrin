import { DashboardNavbar } from '@/components/navigation/dashboard-navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardNavbar />
      <main>{children}</main>
    </>
  );
}

