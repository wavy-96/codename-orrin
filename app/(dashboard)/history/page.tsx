import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, evaluations(overall_score)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl">
      <div className="mb-12">
        <div>
          <h1 className="text-4xl font-serif font-medium tracking-tight text-ethics-black mb-3">Interview History</h1>
          <p className="text-muted-foreground text-lg">
            Review your past interviews and track your progress
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {!interviews || interviews.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No interviews yet</p>
                <Button asChild>
                  <Link href="/new-interview">Start Your First Interview</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            interviews.map((interview: any) => {
              const evaluation = interview.evaluations?.[0];
              const criteria = interview.criteria as any;

              return (
                <Card key={interview.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{criteria.jobTitle}</CardTitle>
                        <CardDescription>{criteria.companyName}</CardDescription>
                      </div>
                      <Badge variant={
                        interview.status === 'completed' ? 'default' :
                        interview.status === 'in-progress' ? 'secondary' :
                        'outline'
                      }>
                        {interview.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{criteria.interviewType}</span>
                        <span>•</span>
                        <span>{criteria.difficulty}</span>
                        {evaluation && (
                          <>
                            <span>•</span>
                            <span className="font-medium">Score: {evaluation.overall_score}/100</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/interview/${interview.id}/summary`}>View Summary</Link>
                        </Button>
                        {interview.status === 'in-progress' && (
                          <Button asChild size="sm">
                            <Link href={`/interview/${interview.id}`}>Continue</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div>
          <AnalyticsDashboard interviews={interviews || []} />
        </div>
      </div>
    </div>
  );
}

