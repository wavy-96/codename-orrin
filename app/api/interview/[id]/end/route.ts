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

    // Get interview before ending
    const { data: interview } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Update interview status to completed
    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to end interview' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error ending interview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end interview' },
      { status: 500 }
    );
  }
}

