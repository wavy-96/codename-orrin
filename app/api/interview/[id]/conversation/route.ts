import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewResponse, generateInterviewQuestion, generateInterviewerPersona } from '@/lib/openai/interview';
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

    const body = await request.json();
    const { userMessage, isFirstQuestion, timeRemainingSeconds } = body;

    // 1. Parallelize DB Fetches
    const [interviewResult, conversationsResult] = await Promise.all([
      supabase
        .from('interviews')
        .select(`*, linkedin_profiles (parsed_data)`)
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('conversations')
        .select('*')
        .eq('interview_id', id)
        .order('timestamp', { ascending: true })
    ]);

    const interview = interviewResult.data;
    const conversations = conversationsResult.data || [];

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Update status if pending (fire and forget)
    if (interview.status === 'pending') {
      supabase.from('interviews').update({
        status: 'in-progress',
        started_at: new Date().toISOString(),
      }).eq('id', id).then();
    }

    // 2. Prepare Context
    const conversationHistory = conversations.map((conv) => ({
      role: conv.role as 'user' | 'interviewer',
      content: conv.message,
    }));

    // Persona Setup
    let persona: any;
    if (interview.meta_prompt) {
      const linkedInProfile = Array.isArray(interview.linkedin_profiles) ? interview.linkedin_profiles[0] : interview.linkedin_profiles;
      const linkedInData = linkedInProfile?.parsed_data || null;
      persona = {
        name: linkedInData?.name || 'the interviewer',
        pronouns: linkedInData?.gender === 'male' ? ['he', 'him', 'his'] : ['she', 'her', 'her'],
        communicationStyle: linkedInData?.communicationStyle || 'professional and direct',
        systemPrompt: interview.meta_prompt,
      };
    } else {
      // Fallback (slower, but rare)
      const linkedInProfile = Array.isArray(interview.linkedin_profiles) ? interview.linkedin_profiles[0] : interview.linkedin_profiles;
      const linkedInData = linkedInProfile?.parsed_data || null;
      persona = await generateInterviewerPersona(interview.criteria as InterviewCriteria, linkedInData);
    }

    // 3. Handle First Question (Non-streaming for simplicity/consistency with existing logic, or stream it too?)
    // For now, keep first question logic simple as it's usually fast/pre-generated.
    if (isFirstQuestion) {
      // ... existing first question logic ...
      // (To save time, I'll just return the string response for first question, frontend handles both)
      const existingFirstQuestion = conversationHistory.find(
        msg => msg.role === 'interviewer' &&
          (msg.content.includes('thanks for coming') || msg.content.includes('Why don\'t you start'))
      );

      if (existingFirstQuestion) {
        return NextResponse.json({ message: existingFirstQuestion.content, conversationId: null });
      }

      const interviewerMessage = await generateInterviewQuestion(
        persona,
        interview.criteria as InterviewCriteria,
        [],
        true,
        undefined,
        timeRemainingSeconds
      );

      // Save to DB
      const { data: conversation } = await supabase.from('conversations').insert({
        interview_id: id,
        role: 'interviewer',
        message: interviewerMessage,
      }).select().single();

      return NextResponse.json({ message: interviewerMessage, conversationId: conversation?.id });
    }

    // 4. Streaming Response for User Interaction
    if (userMessage) {
      // Save user message (Fire and forget / non-blocking for the stream)
      supabase.from('conversations').insert({
        interview_id: id,
        role: 'user',
        message: userMessage,
      }).then();

      // Add user message to history for context
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      // Import the streaming function dynamically to avoid circular deps if any
      const { generateInterviewResponseStream } = await import('@/lib/openai/interview');

      const stream = await generateInterviewResponseStream(
        persona,
        interview.criteria as InterviewCriteria,
        userMessage,
        updatedHistory,
        timeRemainingSeconds
      );

      // Create a TransformStream to accumulate text and save to DB at the end
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let fullResponse = '';

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(content));
          }
        },
        async flush(controller) {
          // Save full response to DB after stream ends
          if (fullResponse.trim()) {
            await supabase.from('conversations').insert({
              interview_id: id,
              role: 'interviewer',
              message: fullResponse,
            });
          }
        }
      });

      // Return the stream
      return new NextResponse(stream.toReadableStream().pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    return NextResponse.json({ error: 'User message required' }, { status: 400 });

  } catch (error: any) {
    console.error('Error in conversation route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process conversation' },
      { status: 500 }
    );
  }
}

