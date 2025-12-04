import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  History, 
  BarChart3, 
  ArrowRight, 
  Calendar, 
  Clock, 
  ChevronRight,
  Sparkles,
  CheckCircle2,
  BrainCircuit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile for first name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name')
    .eq('user_id', user.id)
    .single();

  // Fetch recent interviews for display
  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, evaluations(overall_score)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(4);

  // Fetch evaluations directly for more reliable average calculation
  // First get all completed interview IDs for this user
  const { data: completedInterviewIds } = await supabase
    .from('interviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'completed');

  // Then fetch all evaluations for those interviews and compute pass rate
  let avgPassRate = 0;
  const completedSessionsCount = completedInterviewIds?.length || 0;
  if (completedSessionsCount > 0 && completedInterviewIds) {
    const interviewIds = completedInterviewIds.map(i => i.id);
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('would_pass_to_next_round')
      .in('interview_id', interviewIds);

    if (evaluations && evaluations.length > 0) {
      const decisions = evaluations
        .map((e: any) => e.would_pass_to_next_round)
        .filter((v): v is boolean => v !== null && v !== undefined);

      if (decisions.length > 0) {
        const passCount = decisions.filter(Boolean).length;
        avgPassRate = Math.round((passCount / decisions.length) * 100);
      }
    }
  }

  // Fetch total stats
  const { count } = await supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const profileFirstName = (profile as any)?.first_name as string | null | undefined;
  const metadataFirstName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.split(' ')[0]
      : null;
  const emailFallback = user.email?.split('@')[0] || null;
  const userName = profileFirstName || metadataFirstName || emailFallback || 'Friend';
  const totalInterviews = count || 0;
  const recentInterviews = interviews || [];

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getPassRateMessage = (rate: number) => {
    if (completedSessionsCount === 0) {
      return 'Complete a few interviews to see your pass rate.';
    }
    if (rate < 50) {
      return 'Needs work — keep practicing and reviewing your feedback.';
    }
    if (rate < 70) {
      return 'You’re getting there — push a bit more to improve your odds.';
    }
    return 'You’re doing great — keep up the strong performance.';
  };

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col gap-3 mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-ethics-black">
          {getTimeGreeting()}, {userName}.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          This is your interview preparation control center. Let&apos;s get you ready.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Hero Card - Start New (Span 8) */}
        <div className="md:col-span-8">
          <Link href="/new-interview" className="block h-full group">
            <Card 
              className="h-full relative overflow-hidden border-none shadow-xl text-white p-8 sm:p-10 flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:scale-[1.005]"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              {/* Abstract Decoration */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-dialogue-coral/20 to-morality-teal/20 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <Badge className="bg-white/10 hover:bg-white/20 text-white border-none mb-4 backdrop-blur-md">
                  New Session
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-serif leading-tight mb-4 text-white">
                  Start a new<br />
                  <span className="text-white/90">practice interview</span>
                </h2>
                <p className="text-white/60 max-w-md leading-relaxed">
                  Configure a tailored session with AI. Choose your role, focus areas, and difficulty level to simulate real-world scenarios.
                </p>
              </div>

              <div className="relative z-10 mt-8 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium text-lg group-hover:translate-x-1 transition-transform duration-300 text-white">
                  Start interview
                </span>
              </div>
            </Card>
          </Link>
        </div>

        {/* Analytics Summary (Span 4) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {/* Average Pass Rate Card */}
          <Card className="glass-card p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-morality-teal/30 transition-colors">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Avg. Pass Rate</span>
                </div>
                <div className="text-4xl font-serif font-medium text-ethics-black leading-tight">
                  {completedSessionsCount > 0 ? avgPassRate : '—'}
                  <span className="text-xl text-muted-foreground ml-1 font-sans font-normal">%</span>
                </div>
              </div>
              <div className="text-xs text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-warm-sand/60 border border-black/5 text-ethics-black/80">
                  {completedSessionsCount} completed sessions
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-morality-teal transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${completedSessionsCount > 0 ? avgPassRate : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getPassRateMessage(avgPassRate)}
              </p>
            </div>
        </Card>

          {/* Quick Action: Analytics */}
          <Link href="/history" className="block">
            <Card className="glass-card p-6 flex flex-row items-center justify-between group hover:bg-white/80 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-reason-purple/10 text-reason-purple group-hover:bg-reason-purple group-hover:text-white transition-colors flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-medium text-ethics-black leading-tight">Analytics</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Deep dive into your data</p>
                </div>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent group-hover:bg-black/5 transition-colors">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-ethics-black transition-colors" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Recent History List (Span 8) */}
        <div className="md:col-span-8">
          <Card className="glass-card h-full p-0 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white/40 backdrop-blur-sm">
              <h3 className="text-xl font-serif font-medium">Recent Activity</h3>
              <Link href="/history" className="text-sm font-medium text-muted-foreground hover:text-ethics-black flex items-center gap-1 transition-colors">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="divide-y divide-black/5">
              {recentInterviews.length > 0 ? (
                recentInterviews.map((interview: any) => {
                  const criteria = interview.criteria as any;
                  const date = new Date(interview.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                  
                  return (
                    <Link key={interview.id} href={`/interview/${interview.id}/summary`} className="block group hover:bg-white/50 transition-colors">
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-serif border shrink-0 ${
                            interview.status === 'completed' 
                              ? 'bg-dialogue-coral/10 text-dialogue-coral border-dialogue-coral/20' 
                              : 'bg-warm-sand text-muted-foreground border-black/5'
                          }`}>
                            {criteria.jobTitle.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-ethics-black truncate group-hover:text-dialogue-coral transition-colors">
                              {criteria.jobTitle}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {date}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{criteria.difficulty}</span>
                              {criteria.companyName && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[100px]">{criteria.companyName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 pl-4 shrink-0">
                          {interview.status === 'completed' && interview.evaluations?.[0]?.overall_score && (
                            <Badge variant="secondary" className="font-mono font-medium bg-black/5 hover:bg-black/10 border-none">
                              {interview.evaluations[0].overall_score}/100
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-ethics-black transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No interviews yet. Start your first session above!</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tips / Secondary (Span 4) */}
        <div className="md:col-span-4">
          <Card className="glass-card h-full p-6 bg-gradient-to-br from-white/60 to-warm-sand/60 border-black/5">
            <div className="flex items-center gap-2 mb-4 text-reason-purple">
              <BrainCircuit className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Pro Tip</span>
            </div>
            <h3 className="text-xl font-serif font-medium mb-3">
              Focus on storytelling
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Use the STAR method (Situation, Task, Action, Result) to structure your behavioral answers. Our AI specifically looks for this pattern in your responses.
            </p>
            <div className="p-4 rounded-lg bg-white/50 border border-white/40 text-xs text-muted-foreground italic">
              "The best answers are those that paint a clear picture of your impact."
            </div>
        </Card>
        </div>

      </div>
    </div>
  );
}


