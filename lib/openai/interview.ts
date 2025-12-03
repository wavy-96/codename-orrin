import { openai } from './client';
import type { InterviewCriteria } from '@/types/interview';
import type { ParsedLinkedInData } from '@/types/linkedin';

export interface InterviewerPersona {
  name: string;
  pronouns: string[];
  communicationStyle: string;
  systemPrompt: string;
}

export async function summarizeGuidance(guidance: string): Promise<string> {
  if (!guidance || guidance.trim().length === 0) {
    return '';
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize interview guidance into concise points.',
        },
        {
          role: 'user',
          content: `Summarize these notes for an interviewer:\n\n${guidance}`,
        },
      ],
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error summarizing guidance:', error);
    return guidance;
  }
}

export async function summarizeResume(
  resumeData: any,
  criteria: InterviewCriteria
): Promise<string> {
  if (!resumeData) {
    return '';
  }

  try {
    // Build a structured representation of the resume
    const resumeText = JSON.stringify(resumeData, null, 2);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that creates concise, interview-focused summaries of candidate resumes. 
Focus on:
1. Relevant experience for the target role
2. Key skills that match the job requirements
3. Notable achievements or projects
4. Years of experience and career progression

Keep the summary to 3-4 sentences maximum. Format it for an interviewer to quickly understand the candidate's background.`,
        },
        {
          role: 'user',
          content: `Create an interview-focused summary of this candidate's resume for a ${criteria.jobTitle} position.

Target Role: ${criteria.jobTitle}
Focus Areas: ${criteria.focusAreas.join(', ')}
${criteria.companyName ? `Company: ${criteria.companyName}` : ''}

Resume Data:
${resumeText}

Provide a concise summary that highlights the candidate's most relevant experience and skills for this role.`,
        },
      ],
      max_completion_tokens: 200,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error summarizing resume:', error);
    // Fallback to basic formatting if summarization fails
    let fallback = '';
    if (resumeData.name) fallback += `Candidate: ${resumeData.name}\n`;
    if (resumeData.summary) fallback += `Summary: ${resumeData.summary}\n`;
    if (resumeData.experience && resumeData.experience.length > 0) {
      fallback += `Experience: ${resumeData.experience.slice(0, 2).map((e: any) => `${e.title} at ${e.company}`).join(', ')}\n`;
    }
    if (resumeData.skills && resumeData.skills.length > 0) {
      fallback += `Skills: ${resumeData.skills.slice(0, 8).join(', ')}`;
    }
    return fallback;
  }
}

export async function generateInterviewerPersona(
  criteria: InterviewCriteria,
  linkedInData?: ParsedLinkedInData | null,
  resumeData?: any | null
): Promise<InterviewerPersona> {
  let pronouns: string[] = ['they', 'them', 'their'];
  if (linkedInData?.gender === 'male') {
    pronouns = ['he', 'him', 'his'];
  } else if (linkedInData?.gender === 'female') {
    pronouns = ['she', 'her', 'her'];
  }

  const name = linkedInData?.name || 'the interviewer';
  const role = linkedInData?.role || 'Hiring Manager';
  const company = linkedInData?.company || criteria.companyName;
  const communicationStyle = linkedInData?.communicationStyle || 'professional and direct';
  const interviewerPersonality = linkedInData?.interviewerPersonality || linkedInData?.bio || '';

  let guidanceSummary = '';
  if (criteria.guidance && criteria.guidance.trim().length > 0) {
    guidanceSummary = await summarizeGuidance(criteria.guidance);
  }

  // Build context about the candidate using AI summarization
  let candidateContext = '';
  if (resumeData) {
    const resumeSummary = await summarizeResume(resumeData, criteria);
    if (resumeSummary) {
      candidateContext = `\n\nCANDIDATE BACKGROUND:\n${resumeSummary}`;
    }
  }

  let roleContext = '';
  if (criteria.jobDescription) {
    roleContext += '\n\nJOB DESCRIPTION:\n';
    // Truncate to first 500 chars to keep context manageable
    const truncatedJD = criteria.jobDescription.length > 500 
      ? criteria.jobDescription.substring(0, 500) + '...'
      : criteria.jobDescription;
    roleContext += truncatedJD;
  }

  // Core meta prompt with natural conversation flow
  let systemPrompt = `You are ${name}, ${role} at ${company}. You are conducting a ${criteria.interviewType} interview for the ${criteria.jobTitle} position.

OVERALL BEHAVIOR:
- Act like a real interviewer having a natural conversation.
- Be professional but warm.
- Keep your responses concise (1-3 sentences) since this is a voice interaction.
- Ask ONE question at a time.

INTERVIEW STRUCTURE:

1. **ICE BREAKER (Current Phase)**: 
   - Start with a friendly greeting and a generic small talk question (e.g., "How's your day going?" or "Did you do anything fun this weekend?").
   - Do NOT introduce yourself or the role yet. Keep it casual.

2. **INTRODUCTION (After user replies to small talk)**:
   - Acknowledge their small talk response.
   - Introduce yourself and the role (1-2 sentences).
   - Ask the candidate to introduce themselves.

3. **MAIN INTERVIEW**:
   - After their intro, transition into interview questions.
   - Ask questions one by one.
   - If they struggle, offer a light nudge.
   - If they go off-topic, gently redirect.

INTERVIEW PARAMETERS:
- Difficulty: ${criteria.difficulty}
- Focus Areas: ${criteria.focusAreas.join(', ')}
- Communication Style: ${communicationStyle}
${interviewerPersonality ? `- Match the interviewer personality: ${interviewerPersonality}\n` : ''}
${candidateContext ? `${candidateContext}\n` : ''}
${roleContext ? `${roleContext}\n` : ''}
${guidanceSummary ? `CUSTOM GUIDANCE:\n${guidanceSummary}\n` : ''}

TIME MANAGEMENT:
- If time < 1 minute: WRAP UP IMMEDIATELY. Thank them and end.
- Do NOT ask new questions when time is running out.

Your goal is to assess the candidate through a natural conversation.`;

  return {
    name,
    pronouns,
    communicationStyle,
    systemPrompt,
  };
}

export async function generateInterviewQuestion(
  persona: InterviewerPersona,
  criteria: InterviewCriteria,
  conversationHistory: Array<{ role: 'user' | 'interviewer'; content: string }>,
  isFirstQuestion: boolean = false,
  questionBank?: Array<{ question: string; category: string; difficulty: string; followUpSuggestions?: string[] }>,
  timeRemainingSeconds?: number
): Promise<string> {
  const isGreeting = isFirstQuestion && conversationHistory.length === 0;

  // Simplified prompt logic
  let prompt = '';

  if (isGreeting) {
    // Use actual values, not placeholders
    const hasRealName = persona.name && persona.name !== 'the interviewer';
    const interviewerName = hasRealName ? persona.name : 'the Hiring Manager';
    const companyText = criteria.companyName ? ` at ${criteria.companyName}` : '';
    
    prompt = `You are starting the interview.
    
1. Say a friendly "Hi" or "Hello".
2. Ask ONE simple small talk question (e.g., "How is your day going so far?" or "How was your weekend?").

CRITICAL RULES:
- Do NOT introduce yourself yet.
- Do NOT talk about the job yet.
- Do NOT ask for their introduction yet.
- JUST do the greeting and small talk question.
- Keep it under 2 sentences.`;
  } else {
    const timeContext = timeRemainingSeconds !== undefined 
      ? `${Math.floor(timeRemainingSeconds / 60)}:${String(timeRemainingSeconds % 60).padStart(2, '0')} (${Math.floor(timeRemainingSeconds / 60)} minutes)`
      : 'Unknown';
    
    let timeInstruction = '';
    if (timeRemainingSeconds !== undefined) {
      if (timeRemainingSeconds < 60) {
        timeInstruction = '\n\nURGENT: Less than 1 minute remaining! You MUST wrap up the interview. Thank the candidate, ask if they have questions, and conclude. DO NOT ask new questions.';
      } else if (timeRemainingSeconds < 120) {
        timeInstruction = '\n\nWARNING: Less than 2 minutes remaining. Begin transitioning to wrap-up.';
      }
    }
    
    prompt = `Based on the conversation, continue naturally.
    
Context:
- Role: ${criteria.jobTitle}
- Focus: ${criteria.focusAreas.join(', ')}
- Time Remaining: ${timeContext}${timeInstruction}

${questionBank && questionBank.length > 0 ? `Suggested Questions (use if relevant):\n${questionBank.slice(0, 3).map(q => `- ${q.question}`).join('\n')}` : ''}

Instructions:
- Acknowledge their previous answer briefly (1 sentence).
- Ask a relevant follow-up or a new question from the focus areas.
- Keep it SHORT (1-2 sentences) since this is voice.
- Keep the conversation natural and conversational.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Force fast model
      messages: [
        { role: 'system', content: persona.systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role === 'interviewer' ? 'assistant' : 'user',
          content: msg.content
        } as const)),
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() || 'Tell me about yourself.';
  } catch (error) {
    console.error('Error generating question:', error);
    return 'Tell me about yourself.';
  }
}

export async function generateInterviewResponse(
  persona: InterviewerPersona,
  criteria: InterviewCriteria,
  userAnswer: string,
  conversationHistory: Array<{ role: 'user' | 'interviewer'; content: string }>,
  timeRemainingSeconds?: number
): Promise<string> {
  try {
    // Limit history to last 6 messages for context but speed
    const recentHistory = conversationHistory.slice(-6);

    let systemPrompt = persona.systemPrompt;

    // Add time awareness to the prompt
    if (timeRemainingSeconds !== undefined) {
      const minutes = Math.floor(timeRemainingSeconds / 60);
      const seconds = timeRemainingSeconds % 60;
      const timeString = `${minutes}:${String(seconds).padStart(2, '0')}`;
      
      if (timeRemainingSeconds < 60) {
        systemPrompt += `\n\nURGENT TIME ALERT: Only ${timeRemainingSeconds} seconds remaining (less than 1 minute)!\n\nYou MUST immediately wrap up the interview. Thank the candidate, ask if they have any questions for you, and conclude professionally. DO NOT ask any new interview questions.`;
      } else if (timeRemainingSeconds < 120) {
        systemPrompt += `\n\nTIME WARNING: Less than 2 minutes remaining (${timeString}). Begin transitioning to wrap-up. Consider asking if the candidate has questions.`;
      } else {
        systemPrompt += `\n\n⏱TIME REMAINING: ${timeString} (${Math.floor(timeRemainingSeconds / 60)} minutes).`;
        
        // Add context-aware instruction for the second turn (transition from small talk to intro)
        if (conversationHistory.length <= 2) {
           const hasRealName = persona.name && persona.name !== 'the interviewer';
           const interviewerName = hasRealName ? persona.name : 'the Hiring Manager';
           const companyText = criteria.companyName ? ` at ${criteria.companyName}` : '';
           const roleText = `for the ${criteria.jobTitle} position${companyText}`;
           
           systemPrompt += `\n\nCURRENT PHASE: INTRODUCTION
           
User just replied to your small talk. NOW you must:
1. Briefly acknowledge their response.
2. Introduce yourself: "I'm ${interviewerName}, the Hiring Manager here${companyText}."
3. Mention the role: "I'm conducting this interview ${roleText}."
4. Ask them to introduce themselves: "Could you please introduce yourself?"
`;
        } else {
           systemPrompt += `\n\nCURRENT PHASE: MAIN INTERVIEW. Continue the interview naturally.`;
        }
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(msg => ({
        role: msg.role === 'interviewer' ? 'assistant' : 'user',
        content: msg.content
      } as const)),
      { role: 'user', content: userAnswer }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Force fast model
      messages: messages as any,
      max_completion_tokens: 100, // Short response
    });

    return response.choices[0]?.message?.content?.trim() || 'Could you elaborate on that?';
  } catch (error) {
    console.error('Error generating response:', error);
    return 'Could you elaborate on that?';
  }
}

export async function generateInterviewResponseStream(
  persona: InterviewerPersona,
  criteria: InterviewCriteria,
  userAnswer: string,
  conversationHistory: Array<{ role: 'user' | 'interviewer'; content: string }>,
  timeRemainingSeconds?: number
): Promise<any> {
  try {
    // Limit history to last 6 messages for context but speed
    const recentHistory = conversationHistory.slice(-6);

    let systemPrompt = persona.systemPrompt;

    // Add time awareness to the prompt
    if (timeRemainingSeconds !== undefined) {
      const minutes = Math.floor(timeRemainingSeconds / 60);
      const seconds = timeRemainingSeconds % 60;
      const timeString = `${minutes}:${String(seconds).padStart(2, '0')}`;
      
      if (timeRemainingSeconds < 60) {
        systemPrompt += `\n\n⚠️ URGENT TIME ALERT: Only ${timeRemainingSeconds} seconds remaining (less than 1 minute)!\n\nYou MUST immediately wrap up the interview. Thank the candidate, ask if they have any questions for you, and conclude professionally. DO NOT ask any new interview questions.`;
      } else if (timeRemainingSeconds < 120) {
        systemPrompt += `\n\n⏰ TIME WARNING: Less than 2 minutes remaining (${timeString}). Begin transitioning to wrap-up. Consider asking if the candidate has questions.`;
      } else {
        systemPrompt += `\n\n⏱️ TIME REMAINING: ${timeString} (${Math.floor(timeRemainingSeconds / 60)} minutes).`;

        // Add context-aware instruction for the second turn (transition from small talk to intro)
        if (conversationHistory.length <= 2) {
           const hasRealName = persona.name && persona.name !== 'the interviewer';
           const interviewerName = hasRealName ? persona.name : 'the Hiring Manager';
           const companyText = criteria.companyName ? ` at ${criteria.companyName}` : '';
           const roleText = `for the ${criteria.jobTitle} position${companyText}`;
           
           systemPrompt += `\n\nCURRENT PHASE: INTRODUCTION
           
User just replied to your small talk. NOW you must:
1. Briefly acknowledge their response.
2. Introduce yourself: "I'm ${interviewerName}, the Hiring Manager here${companyText}."
3. Mention the role: "I'm conducting this interview ${roleText}."
4. Ask them to introduce themselves: "Could you please introduce yourself?"
`;
        } else {
           systemPrompt += `\n\nCURRENT PHASE: MAIN INTERVIEW. Continue the interview naturally.`;
        }
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(msg => ({
        role: msg.role === 'interviewer' ? 'assistant' : 'user',
        content: msg.content
      } as const)),
      { role: 'user', content: userAnswer }
    ];

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Force fast model
      messages: messages as any,
      max_completion_tokens: 150, // Short response
      stream: true,
    });

    return stream;
  } catch (error) {
    console.error('Error generating response stream:', error);
    throw error;
  }
}

