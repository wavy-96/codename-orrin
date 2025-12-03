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

    const body = await request.json();
    const { currentJobTitle, desiredJobTitle, resumeId } = body;

    if (!currentJobTitle || !desiredJobTitle) {
      return NextResponse.json(
        { error: 'Current and desired job titles are required' },
        { status: 400 }
      );
    }

    if (!resumeId) {
      return NextResponse.json(
        { error: 'Resume PDF is required. Please upload your resume in PDF format.' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          current_job_title: currentJobTitle,
          desired_job_title: desiredJobTitle,
          resume_id: resumeId,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Failed to update profile');
      }
    } else {
      // Create new profile
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          current_job_title: currentJobTitle,
          desired_job_title: desiredJobTitle,
          resume_id: resumeId,
          onboarding_completed: true,
        });

      if (error) {
        console.error('Error creating user profile:', error);
        throw new Error('Failed to create profile');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

