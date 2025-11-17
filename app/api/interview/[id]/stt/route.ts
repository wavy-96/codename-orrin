import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { speechToText } from '@/lib/openai/voice';

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

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const text = await speechToText(audioBuffer);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Error transcribing speech:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe speech' },
      { status: 500 }
    );
  }
}

