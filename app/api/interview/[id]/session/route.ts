import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewerPersona } from '@/lib/openai/interview';
import type { InterviewCriteria } from '@/types/interview';

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

    // Fetch interview details for persona
    const { data: interview } = await supabase
      .from('interviews')
      .select(`*, linkedin_profiles (parsed_data)`)
      .eq('id', id)
      .single();

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Generate Persona / System Prompt
    let systemInstruction = '';
    if (interview.meta_prompt) {
      systemInstruction = interview.meta_prompt;
    } else {
      const linkedInProfile = Array.isArray(interview.linkedin_profiles) ? interview.linkedin_profiles[0] : interview.linkedin_profiles;
      const linkedInData = linkedInProfile?.parsed_data || null;
      const persona = await generateInterviewerPersona(interview.criteria as InterviewCriteria, linkedInData);
      systemInstruction = persona.systemPrompt;
    }

    // Get Ephemeral Token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-10-01",
        voice: "verse",
        instructions: systemInstruction,
        modalities: ["audio", "text"],
        // Enable input audio transcription so we can see what user says
        input_audio_transcription: {
          model: "whisper-1",
        },
        // Configure turn detection to wait longer for user responses
        turn_detection: {
          type: "server_vad",
          threshold: 0.6,           // Voice detection sensitivity (0.0-1.0, higher = less sensitive to noise)
          prefix_padding_ms: 300,   // Include audio before speech detected
          silence_duration_ms: 1200, // Wait 1.2 seconds of silence before assuming user is done
          create_response: true,    // Automatically create response when user stops speaking
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Session Error:", errorText);
      throw new Error(`OpenAI Error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      client_secret: data.client_secret,
      system_instruction: systemInstruction // Pass this if needed, though session has it
    });

  } catch (error: any) {
    console.error('Error creating realtime session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}
