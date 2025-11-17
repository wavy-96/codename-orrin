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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('interviews')
      .select('*, evaluations(*), linkedin_profiles(parsed_data)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: interviews, error } = await query;

    if (error) {
      console.error('Error fetching interviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interviews' },
        { status: 500 }
      );
    }

    // Remove meta_prompt from response - never expose to client
    const sanitizedInterviews = (interviews || []).map((interview: any) => {
      const { meta_prompt, ...rest } = interview;
      return rest;
    });

    return NextResponse.json(sanitizedInterviews);
  } catch (error: any) {
    console.error('Error in history route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interview history' },
      { status: 500 }
    );
  }
}

