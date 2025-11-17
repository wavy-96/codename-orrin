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

    // Get interview and conversations before ending
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

    // Get conversations for evaluation
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('interview_id', id)
      .order('timestamp', { ascending: true });

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

    // Create evaluation if conversations exist and evaluation doesn't already exist
    if (conversations && conversations.length > 0) {
      // Check if evaluation already exists
      const { data: existingEvaluation } = await supabase
        .from('evaluations')
        .select('id')
        .eq('interview_id', id)
        .single();

      if (!existingEvaluation) {
        try {
          const conversationHistory = conversations.map((conv) => ({
            role: conv.role as 'user' | 'interviewer',
            message: conv.message,
          }));

          const evaluationResult = await evaluateInterview(
            interview.criteria as any,
            conversationHistory
          );

          // Store evaluation
          const { error: evalError } = await supabase
            .from('evaluations')
            .insert({
              interview_id: id,
              criteria_scores: evaluationResult.criteriaScores,
              overall_score: evaluationResult.overallScore,
              feedback: evaluationResult.feedback,
              strengths: evaluationResult.strengths,
              improvements: evaluationResult.improvements,
              would_pass_to_next_round: evaluationResult.wouldPassToNextRound ?? false,
              next_round_reasoning: evaluationResult.nextRoundReasoning ?? '',
            });

          if (evalError) {
            console.error('Error creating evaluation:', evalError);
            // Don't fail the request if evaluation fails
          } else {
            console.log('[End Interview] Evaluation created successfully');
          }
        } catch (evalError: any) {
          console.error('Error evaluating interview:', evalError);
          // Don't fail the request if evaluation fails
        }
      }
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

