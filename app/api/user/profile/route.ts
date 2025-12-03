import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*, candidate_resumes(id, file_name, parsed_data)')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's okay for new users
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Include email from auth user
    return NextResponse.json({
      ...profile,
      email: user.email,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      resumeId,
      currentJobTitle,
      desiredJobTitle,
      firstName,
      lastName,
    }: {
      resumeId?: string | null;
      currentJobTitle?: string | null;
      desiredJobTitle?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } = body;

    // Update or create profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          resume_id: resumeId ?? null,
          current_job_title: currentJobTitle ?? null,
          desired_job_title: desiredJobTitle ?? null,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        throw new Error('Failed to update profile');
      }
    } else {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          resume_id: resumeId ?? null,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
          current_job_title: currentJobTitle ?? null,
          desired_job_title: desiredJobTitle ?? null,
        });

      if (error) {
        throw new Error('Failed to create profile');
      }
    }

    // Return updated profile
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*, candidate_resumes(id, file_name, parsed_data)')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      ...updatedProfile,
      email: user.email,
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

