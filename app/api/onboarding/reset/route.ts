import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset onboarding by setting onboarding_completed to false
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error resetting onboarding:', error);
        throw new Error('Failed to reset onboarding');
      }
    } else {
      // Create profile with onboarding_completed = false
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          onboarding_completed: false,
        });

      if (error) {
        console.error('Error creating profile:', error);
        throw new Error('Failed to create profile');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting onboarding:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset onboarding' },
      { status: 500 }
    );
  }
}

