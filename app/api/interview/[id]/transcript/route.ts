import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, message } = await request.json();

    if (!role || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        interview_id: id,
        role: role, // 'user' or 'interviewer'
        message: message,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error saving transcript:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save transcript' },
      { status: 500 }
    );
  }
}
