'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Interview, Evaluation, ConversationMessage } from '@/types/interview';

interface InterviewSummaryProps {
  interview: Interview;
  evaluation: Evaluation | null;
  conversations: ConversationMessage[];
}

export function InterviewSummary({ interview, evaluation, conversations }: InterviewSummaryProps) {
  if (!evaluation) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3">
          <div className="h-4 w-4 border-2 border-ethics-black/30 border-t-ethics-black rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing...</p>
        </CardContent>
      </Card>
    );
  }

  const criteriaScores = evaluation.criteria_scores as Array<{
    criteria: string;
    score: number;
    feedback: string;
  }>;

  const duration = interview.ended_at && interview.started_at
    ? Math.round((new Date(interview.ended_at).getTime() - new Date(interview.started_at).getTime()) / 1000 / 60)
    : null;

  // Check if this is a failed evaluation (no signals)
  const isFailed = evaluation.overall_score === 0 && 
    evaluation.strengths.some(s => s.includes('Unable to assess') || s.includes('no signals'));

  // Get hiring decision (stored as JSON in database)
  const wouldPassToNextRound = (evaluation as any).would_pass_to_next_round ?? false;
  const nextRoundReasoning = (evaluation as any).next_round_reasoning ?? '';

  return (
    <div className="space-y-6">
      {/* Failed Interview Warning */}
      {isFailed && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Interview Failed
            </CardTitle>
            <CardDescription className="text-red-800 dark:text-red-200">
              We did not receive sufficient signals from this interview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-900 dark:text-red-100 mb-4">
              {evaluation.feedback}
            </p>
            {nextRoundReasoning && (
              <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Hiring Decision:</p>
                <p className="text-sm text-red-800 dark:text-red-200">{nextRoundReasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hiring Decision Card (for successful interviews) */}
      {!isFailed && nextRoundReasoning && (
        <Card className={wouldPassToNextRound ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20'}>
          <CardHeader>
            <CardTitle className={`${wouldPassToNextRound ? 'text-green-900 dark:text-green-100' : 'text-orange-900 dark:text-orange-100'} flex items-center gap-2`}>
              {wouldPassToNextRound ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {wouldPassToNextRound ? 'Recommended for Next Round' : 'Not Recommended for Next Round'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm ${wouldPassToNextRound ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}`}>
              {nextRoundReasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
          <CardDescription>Your interview evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{evaluation.overall_score}/100</span>
            <Badge variant={evaluation.overall_score >= 80 ? 'default' : evaluation.overall_score >= 60 ? 'secondary' : 'destructive'}>
              {isFailed ? 'Failed' : evaluation.overall_score >= 80 ? 'Excellent' : evaluation.overall_score >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
          <Progress value={evaluation.overall_score} className="h-2" />
          {duration && (
            <p className="text-sm text-muted-foreground">Interview duration: {duration} minutes</p>
          )}
        </CardContent>
      </Card>

      {/* Criteria Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Focus Area</CardTitle>
          <CardDescription>Detailed breakdown of your performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteriaScores.map((score, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{score.criteria}</span>
                <span className="text-sm text-muted-foreground">{score.score}/100</span>
              </div>
              <Progress value={score.score} className="h-2" />
              <p className="text-sm text-muted-foreground">{score.feedback}</p>
              {index < criteriaScores.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card>
        <CardHeader>
          <CardTitle>Strengths</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            {evaluation.strengths.map((strength, index) => (
              <li key={index} className="text-sm">{strength}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Areas for Improvement */}
      <Card>
        <CardHeader>
          <CardTitle>Areas for Improvement</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            {evaluation.improvements.map((improvement, index) => (
              <li key={index} className="text-sm">{improvement}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{evaluation.feedback}</p>
        </CardContent>
      </Card>

      {/* Conversation Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversation Statistics</CardTitle>
              <CardDescription>View and download your interview transcript</CardDescription>
            </div>
            {conversations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Format transcript as text
                  const transcript = conversations
                    .map((conv, index) => {
                      const timestamp = conv.timestamp 
                        ? new Date(conv.timestamp).toLocaleString()
                        : `Message ${index + 1}`;
                      const role = conv.role === 'user' ? 'You' : 'Interviewer';
                      return `[${timestamp}] ${role}:\n${conv.message}\n`;
                    })
                    .join('\n');

                  // Add header
                  const header = `Interview Transcript\n` +
                    `Job Title: ${interview.criteria.jobTitle}\n` +
                    `Company: ${interview.criteria.companyName || 'N/A'}\n` +
                    `Interview Type: ${interview.criteria.interviewType}\n` +
                    `Difficulty: ${interview.criteria.difficulty}\n` +
                    `Date: ${interview.started_at ? new Date(interview.started_at).toLocaleDateString() : 'N/A'}\n` +
                    `Duration: ${duration ? `${duration} minutes` : 'N/A'}\n` +
                    `Total Messages: ${conversations.length}\n` +
                    `\n${'='.repeat(50)}\n\n`;

                  const fullTranscript = header + transcript;

                  // Create and download file
                  const blob = new Blob([fullTranscript], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `interview-transcript-${interview.id}-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Transcript
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Messages</p>
              <p className="text-2xl font-bold">{conversations.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Responses</p>
              <p className="text-2xl font-bold">
                {conversations.filter(c => c.role === 'user').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Transcript View */}
      {conversations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Full Transcript</CardTitle>
            <CardDescription>Complete conversation history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversations.map((conv, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    conv.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-950/20 ml-8'
                      : 'bg-purple-50 dark:bg-purple-950/20 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {conv.role === 'user' ? 'You' : 'Interviewer'}
                    </p>
                    {conv.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{conv.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

