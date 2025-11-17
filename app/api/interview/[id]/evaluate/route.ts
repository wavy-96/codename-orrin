import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateInterview } from '@/lib/evaluation/evaluator';

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

    // Get interview and conversations
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Check if evaluation already exists
    const { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id')
      .eq('interview_id', id)
      .single();

    if (existingEvaluation) {
      return NextResponse.json(
        { error: 'Evaluation already exists' },
        { status: 400 }
      );
    }

    // Get conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('interview_id', id)
      .order('timestamp', { ascending: true });

    if (!conversations || conversations.length === 0) {
      return NextResponse.json(
        { error: 'No conversations found' },
        { status: 400 }
      );
    }

    const conversationHistory = conversations.map((conv) => ({
      role: conv.role as 'user' | 'interviewer',
      message: conv.message,
    }));

    // Evaluate interview
    const evaluation = await evaluateInterview(
      interview.criteria as any,
      conversationHistory
    );

    // Store evaluation
    const { data: evaluationData, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        interview_id: id,
        criteria_scores: evaluation.criteriaScores,
        overall_score: evaluation.overallScore,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        would_pass_to_next_round: evaluation.wouldPassToNextRound ?? false,
        next_round_reasoning: evaluation.nextRoundReasoning ?? '',
      })
      .select()
      .single();

    if (evalError) {
      console.error('Error storing evaluation:', evalError);
      return NextResponse.json(
        { error: 'Failed to store evaluation' },
        { status: 500 }
      );
    }

    return NextResponse.json(evaluationData);
  } catch (error: any) {
    console.error('Error evaluating interview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate interview' },
      { status: 500 }
    );
  }
}

