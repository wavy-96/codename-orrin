import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InterviewSummary } from '@/components/analytics/interview-summary';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { evaluateInterview } from '@/lib/evaluation/evaluator';

export default async function InterviewSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get interview
  const { data: interview } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!interview) {
    redirect('/dashboard');
  }

  // Get conversations (needed for both evaluation and display)
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('interview_id', id)
    .order('timestamp', { ascending: true });

  // Get evaluation (create if doesn't exist)
  let { data: evaluation } = await supabase
    .from('evaluations')
    .select('*')
    .eq('interview_id', id)
    .single();

  if (!evaluation && conversations && conversations.length > 0) {
    try {
      // Evaluate interview directly
      const evaluationResult = await evaluateInterview(
        interview.criteria as any,
        conversations.map((conv) => ({
          role: conv.role as 'user' | 'interviewer',
          message: conv.message,
        }))
      );

      // Store evaluation
      const { data: evaluationData, error: evalError } = await supabase
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
        })
        .select()
        .single();

      if (!evalError && evaluationData) {
        evaluation = evaluationData;
      } else {
        console.error('Error storing evaluation:', evalError);
      }
    } catch (error) {
      console.error('Error evaluating interview:', error);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/history"
          className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition hover:-translate-x-0.5 hover:border-ethics-black/30 hover:bg-ethics-black/10"
          aria-label="Back to history"
        >
          <ArrowLeft className="h-5 w-5 text-ethics-black transition group-hover:-translate-x-0.5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Interview Summary</h1>
          <p className="text-muted-foreground mt-2">
            {interview.criteria.jobTitle} at {interview.criteria.companyName}
          </p>
        </div>
      </div>
      <InterviewSummary
        interview={interview}
        evaluation={evaluation}
        conversations={conversations || []}
      />
    </div>
  );
}

