import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { textToSpeech } from '@/lib/openai/voice';

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

    // Verify user owns this interview
    const { data: interview } = await supabase
      .from('interviews')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { text, voice } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const audioBuffer = await textToSpeech(text, voice || 'nova');

    return new NextResponse(audioBuffer as any, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

