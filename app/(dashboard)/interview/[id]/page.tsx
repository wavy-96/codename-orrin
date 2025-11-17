import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { VoiceInterface } from '@/components/interview/voice-interface';

export default async function InterviewPage({
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

  // Verify user owns this interview
  const { data: interview } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!interview) {
    redirect('/dashboard');
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <VoiceInterface 
          interviewId={id} 
          durationMinutes={interview.criteria.duration || 5}
          jobTitle={interview.criteria.jobTitle}
          companyName={interview.criteria.companyName}
          interviewType={interview.criteria.interviewType}
          difficulty={interview.criteria.difficulty}
        />
      </div>
    </div>
  );
}

