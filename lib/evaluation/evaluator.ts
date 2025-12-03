import { openai } from '@/lib/openai/client';
import type { InterviewCriteria, CriteriaScore } from '@/types/interview';

export interface EvaluationResult {
  criteriaScores: CriteriaScore[];
  overallScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  wouldPassToNextRound?: boolean;
  nextRoundReasoning?: string;
}

export async function evaluateInterview(
  criteria: InterviewCriteria,
  conversations: Array<{ role: 'user' | 'interviewer'; message: string }>
): Promise<EvaluationResult> {
  // Check if we have sufficient data for evaluation
  const userMessages = conversations.filter(c => c.role === 'user');
  const hasSubstantiveResponse = userMessages.some(msg => msg.message.trim().split(/\s+/).length >= 5);
  
  // If insufficient data, return a special evaluation indicating this
  if (userMessages.length === 0 || !hasSubstantiveResponse) {
    console.warn('[Evaluation] Insufficient conversation data for evaluation');
    return {
      criteriaScores: criteria.focusAreas.map(area => ({
        criteria: area,
        score: 0,
        feedback: 'No signal received: The interview ended before meaningful responses could be assessed.'
      })),
      overallScore: 0,
      feedback: 'We did not receive sufficient signals from this interview to make an assessment. The interview ended prematurely, which may have been due to non-serious responses, technical issues, or the candidate disengaging early.',
      strengths: ['Unable to assess - no signals received'],
      improvements: [
        'Complete a full interview session with substantive responses',
        'Ensure you understand the role and are prepared to discuss relevant experience',
        'Provide detailed, thoughtful answers to interview questions'
      ],
      wouldPassToNextRound: false,
      nextRoundReasoning: 'We cannot recommend moving forward to the next round as we did not receive sufficient signals to evaluate the candidate\'s qualifications, technical skills, or cultural fit. A complete interview with substantive responses is required to make an informed hiring decision.'
    };
  }

  const conversationText = conversations
    .map((conv) => `${conv.role === 'user' ? 'Candidate' : 'Interviewer'}: ${conv.message}`)
    .join('\n\n');

  const prompt = `You are an expert interview evaluator and hiring manager. Evaluate the candidate's performance in this interview from the perspective of whether you would pass them to the next round.

Interview Criteria:
- Job Title: ${criteria.jobTitle}
- Company: ${criteria.companyName}
- Interview Type: ${criteria.interviewType}
- Difficulty: ${criteria.difficulty}
- Focus Areas: ${criteria.focusAreas.join(', ')}

Conversation:
${conversationText}

Evaluate the candidate's performance and provide:
1. Scores (0-100) for each focus area: ${criteria.focusAreas.join(', ')}
2. An overall score (0-100)
3. Detailed feedback on their performance
4. List of strengths if any (3-5 items)
5. List of areas for improvement (3-5 items)
6. A hiring decision: would you pass this candidate to the next round? (true/false)
7. Reasoning for your hiring decision: Explain why you would or would not pass them to the next round, considering their technical skills, communication, problem-solving, cultural fit, and alignment with the role requirements.

Return your evaluation as a JSON object with this exact structure:
{
  "criteriaScores": [
    {
      "criteria": "focus area name",
      "score": 85,
      "feedback": "detailed feedback for this area"
    }
  ],
  "overallScore": 82,
  "feedback": "Overall comprehensive feedback on the interview performance",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "wouldPassToNextRound": true,
  "nextRoundReasoning": "Detailed explanation of why you would or would not pass this candidate to the next round, considering all factors like technical competency, communication skills, problem-solving ability, cultural fit, and role alignment."
}

Be honest, constructive, and professional. Focus on actionable feedback. Make a clear hiring decision based on what you observed.`;

  try {
    // Complex evaluation task requires deep reasoning - use gpt-5 or gpt-5.1
    // Try multiple models in case one returns empty responses
    const modelsToTry = [
      'gpt-5-mini',                        // Full GPT-5 for complex analysis
      'gpt-5-2025-08-07',             // Pinned GPT-5 version
      'gpt-5.1',                      // Enhanced with better instruction following
      'gpt-5.1-2025-11-13',           // Pinned 5.1 version
      'gpt-5',                   // Fallback if full model unavailable
      'gpt-4',                        // Final fallback
    ];

    let response: any = null;
    for (const model of modelsToTry) {
      try {
        response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert interview evaluator. Provide honest, constructive, and professional feedback. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        });

        if (response.choices?.[0]?.message?.content) {
          console.log(`[Evaluation] Generated with ${model}`);
          break;
        }
      } catch (error: any) {
        console.warn(`[Evaluation] Error with model ${model}:`, error.message);
        continue;
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error('All models failed to generate evaluation');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const evaluation = JSON.parse(content) as EvaluationResult;
    
    // Validate and ensure all focus areas are scored
    const scoredAreas = new Set(evaluation.criteriaScores.map(s => s.criteria));
    for (const area of criteria.focusAreas) {
      if (!scoredAreas.has(area)) {
        evaluation.criteriaScores.push({
          criteria: area,
          score: evaluation.overallScore,
          feedback: 'No specific questions asked in this area.',
        });
      }
    }

    // Ensure hiring decision fields exist (default to false if missing)
    if (evaluation.wouldPassToNextRound === undefined) {
      evaluation.wouldPassToNextRound = evaluation.overallScore >= 70; // Default threshold
    }
    if (!evaluation.nextRoundReasoning) {
      evaluation.nextRoundReasoning = evaluation.wouldPassToNextRound
        ? `Based on the interview performance, the candidate demonstrates sufficient qualifications and alignment with the role requirements to proceed to the next round.`
        : `Based on the interview performance, the candidate does not meet the minimum requirements or demonstrate sufficient alignment with the role to proceed to the next round.`;
    }

    return evaluation;
  } catch (error) {
    console.error('Error evaluating interview:', error);
    throw new Error('Failed to evaluate interview');
  }
}

