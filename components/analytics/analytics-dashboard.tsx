'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AnalyticsDashboardProps {
  interviews: any[];
}

export function AnalyticsDashboard({ interviews }: AnalyticsDashboardProps) {
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const evaluations = completedInterviews
    .map(i => i.evaluations?.[0])
    .filter(Boolean);

  const averageScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length)
    : 0;

  const totalInterviews = interviews.length;
  const completedCount = completedInterviews.length;

  // Calculate score trend (last 3 vs previous 3)
  const recentScores = evaluations.slice(0, 3).map(e => e.overall_score);
  const previousScores = evaluations.slice(3, 6).map(e => e.overall_score);
  
  const recentAvg = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 0;
  const previousAvg = previousScores.length > 0
    ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
    : 0;

  const trend = recentAvg - previousAvg;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Interviews</span>
              <span className="text-2xl font-bold">{totalInterviews}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="text-2xl font-bold">{completedCount}</span>
            </div>
          </div>
          {evaluations.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Average Score</span>
                  <span className="text-2xl font-bold">{averageScore}/100</span>
                </div>
                <Progress value={averageScore} className="h-2" />
              </div>
              {trend !== 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Trend: </span>
                  <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} points
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

