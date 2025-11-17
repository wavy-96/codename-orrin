import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseLinkedInProfile, fetchLinkedInProfile } from '@/lib/openai/linkedin-parser';
import type { ParsedLinkedInData } from '@/types/linkedin';

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
    const { profileUrl, profileContent } = body;

    if (!profileUrl && !profileContent) {
      return NextResponse.json(
        { error: 'Either profileUrl or profileContent is required' },
        { status: 400 }
      );
    }

    let content = profileContent;

    // If URL is provided, try to fetch content
    if (profileUrl && !profileContent) {
      content = await fetchLinkedInProfile(profileUrl);
      
      // If fetching fails, return error asking for manual input
      if (!content) {
        return NextResponse.json(
          { 
            error: 'Could not fetch LinkedIn profile. Please paste the profile content manually.',
            requiresManualInput: true 
          },
          { status: 400 }
        );
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Profile content is required' },
        { status: 400 }
      );
    }

    // Parse the profile using OpenAI
    const parsedData = await parseLinkedInProfile(content);

    // Check if profile already exists for this user
    const { data: existingProfile } = await supabase
      .from('linkedin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('profile_url', profileUrl || 'manual')
      .single();

    let profileId: string;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('linkedin_profiles')
        .update({
          parsed_data: parsedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (error) throw error;
      profileId = data.id;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('linkedin_profiles')
        .insert({
          user_id: user.id,
          profile_url: profileUrl || 'manual',
          parsed_data: parsedData,
        })
        .select()
        .single();

      if (error) throw error;
      profileId = data.id;
    }

    return NextResponse.json({
      id: profileId,
      parsedData,
    });
  } catch (error: any) {
    console.error('Error parsing LinkedIn profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse LinkedIn profile' },
      { status: 500 }
    );
  }
}

