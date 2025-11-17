import { openai } from './client';
import type { InterviewCriteria } from '@/types/interview';

export interface QuestionBankQuestion {
  question: string;
  category: string; // e.g., "Technical", "Behavioral", "System Design", etc.
  difficulty: 'easy' | 'medium' | 'hard';
  followUpSuggestions?: string[]; // Optional follow-up questions
}

export interface QuestionBank {
  jobTitle: string;
  interviewType: string;
  difficulty: string;
  focusAreas: string[];
  questions: QuestionBankQuestion[];
  sourceUrls: string[];
}

/**
 * Generates an interview question bank by scraping the web for role-specific questions
 * Uses OpenAI's browsing capability to find and extract relevant interview questions
 */
export async function generateQuestionBank(
  criteria: InterviewCriteria
): Promise<QuestionBank> {
  console.log(`[Question Bank] Generating question bank for: ${criteria.jobTitle} (${criteria.interviewType}, ${criteria.difficulty})`);
  
  try {
    // Create an assistant with browsing capability
    const assistant = await openai.beta.assistants.create({
      name: 'Interview Question Bank Generator',
      instructions: `You are a research assistant that finds and extracts interview questions from the web. 
      Search for interview questions specific to the given role, interview type, and difficulty level.
      Focus on finding questions from reputable sources like:
      - Company interview preparation sites (Glassdoor, Indeed, etc.)
      - Technical interview platforms (LeetCode discussions, InterviewBit, etc.)
      - Industry blogs and career sites
      - GitHub repositories with interview questions
      
      Extract questions that are:
      - Relevant to the specific job title and role
      - Appropriate for the interview type (technical, behavioral, etc.)
      - Matched to the difficulty level
      - Cover the focus areas mentioned
      
      Return a comprehensive list of questions with their categories and difficulty levels.`,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' as any }], // Note: browsing tool deprecated, using file_search as placeholder
    });

    // Build search query
    const searchQuery = `interview questions for ${criteria.jobTitle} ${criteria.interviewType} ${criteria.difficulty} level ${criteria.focusAreas.join(' ')}`;
    
    const userMessage = `Please search the web and find interview questions for:
- Job Title: ${criteria.jobTitle}
- Interview Type: ${criteria.interviewType}
- Difficulty Level: ${criteria.difficulty}
- Focus Areas: ${criteria.focusAreas.join(', ')}

Search for questions from multiple sources including:
1. Company interview preparation sites (Glassdoor, Indeed, etc.)
2. Technical interview platforms (LeetCode, InterviewBit, etc.)
3. Industry blogs and career sites
4. GitHub repositories with interview questions

Find at least 20-30 diverse questions covering:
- Technical questions (if applicable)
- Behavioral questions
- System design questions (if applicable)
- Problem-solving questions
- Role-specific questions

For each question, identify:
- The question text
- Category (Technical, Behavioral, System Design, etc.)
- Difficulty level (easy, medium, hard)
- Source URL (if available)

Return the results as a structured list. Include the URLs of sources you found.`;

    // Create a thread and run
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage,
    });

    // Run the assistant
    let run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Poll for completion (with timeout)
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    while ((run.status === 'queued' || run.status === 'in_progress') && (Date.now() - startTime < maxWaitTime)) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
      run = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id }) as any;
    }

    if (run.status === 'completed') {
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(
        (msg) => msg.role === 'assistant'
      );

      if (assistantMessage) {
        // Find text content in the message
        const textContent = assistantMessage.content.find(
          (content) => content.type === 'text'
        );

        if (textContent && textContent.type === 'text') {
          const scrapedContent = textContent.text.value;
          
          // Clean up assistant
          await openai.beta.assistants.delete(assistant.id);
          
          // Parse the scraped content and extract structured questions
          const parsedBank = await parseScrapedContent(scrapedContent, criteria);
          
          console.log(`[Question Bank] Generated ${parsedBank.questions.length} questions`);
          return parsedBank;
        }
      }
    }

    // Clean up assistant
    await openai.beta.assistants.delete(assistant.id);

    if (run.status === 'failed') {
      throw new Error(`Failed to generate question bank: ${run.last_error?.message || 'Unknown error'}`);
    }
    
    throw new Error(`Question bank generation timed out or failed: ${run.status}`);
  } catch (error: any) {
    console.error('[Question Bank] Error generating question bank:', error);
    throw new Error(`Failed to generate question bank: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Parses scraped web content and extracts structured interview questions
 */
async function parseScrapedContent(
  content: string,
  criteria: InterviewCriteria
): Promise<QuestionBank> {
  const prompt = `You are a question bank parser. Extract structured interview questions from the following scraped web content.

Job Title: ${criteria.jobTitle}
Interview Type: ${criteria.interviewType}
Difficulty: ${criteria.difficulty}
Focus Areas: ${criteria.focusAreas.join(', ')}

Scraped Content:
${content.substring(0, 15000)} ${content.length > 15000 ? '... (truncated)' : ''}

Extract all interview questions and organize them into a structured format. For each question, identify:
1. The question text (exact wording when possible)
2. Category (Technical, Behavioral, System Design, Problem Solving, etc.)
3. Difficulty level (easy, medium, hard) - based on the content or infer from context
4. Optional: Follow-up questions that could naturally follow

Also extract any source URLs mentioned in the content.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Full question text",
      "category": "Technical | Behavioral | System Design | Problem Solving | etc.",
      "difficulty": "easy | medium | hard",
      "followUpSuggestions": ["optional follow-up question 1", "optional follow-up question 2"]
    }
  ],
  "sourceUrls": ["url1", "url2", ...]
}

Return ONLY valid JSON, no additional text or markdown formatting.`;

  try {
    const modelsToTry = [
      'gpt-5-mini',
      'gpt-5-mini-2025-08-07',
      'gpt-4o-mini',
      'gpt-4o',
    ];

    let response: any = null;
    for (const model of modelsToTry) {
      try {
        response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts structured interview questions from web content. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        });

        if (response.choices?.[0]?.message?.content) {
          console.log(`[Question Bank Parser] Generated with ${model}`);
          break;
        }
      } catch (error: any) {
        console.warn(`[Question Bank Parser] Error with model ${model}:`, error.message);
        continue;
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error('All models failed to parse question bank');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as { questions: QuestionBankQuestion[]; sourceUrls: string[] };
    
    // Validate and ensure minimum questions
    if (!parsed.questions || parsed.questions.length === 0) {
      throw new Error('No questions extracted from scraped content');
    }

    // Ensure all questions have required fields
    const validatedQuestions = parsed.questions
      .filter(q => q.question && q.category && q.difficulty)
      .map(q => ({
        question: q.question.trim(),
        category: q.category,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        followUpSuggestions: q.followUpSuggestions || [],
      }));

    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions found after validation');
    }

    return {
      jobTitle: criteria.jobTitle,
      interviewType: criteria.interviewType,
      difficulty: criteria.difficulty,
      focusAreas: criteria.focusAreas,
      questions: validatedQuestions,
      sourceUrls: parsed.sourceUrls || [],
    };
  } catch (error: any) {
    console.error('[Question Bank Parser] Error parsing scraped content:', error);
    throw new Error(`Failed to parse question bank: ${error.message || 'Unknown error'}`);
  }
}

