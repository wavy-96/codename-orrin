'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  collapsed?: boolean;
}

export function LogoutButton({ collapsed = false }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleLogout}
      className={cn(
        'w-full justify-start text-ethics-black/70 hover:text-ethics-black hover:bg-warm-sand/50',
        collapsed && 'w-auto justify-center px-2'
      )}
    >
      <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
      {!collapsed && 'Logout'}
    </Button>
  );
}

