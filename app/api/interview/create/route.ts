import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewerPersona } from '@/lib/openai/interview';
import { generateQuestionBank } from '@/lib/openai/question-bank';
import type { InterviewCriteria } from '@/types/interview';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { criteria, linkedinProfileId }: { criteria: InterviewCriteria; linkedinProfileId?: string | null } = body;

    if (!criteria) {
      return NextResponse.json(
        { error: 'Interview criteria is required' },
        { status: 400 }
      );
    }

    // Get LinkedIn profile data if provided
    let linkedInData = null;
    if (linkedinProfileId) {
      const { data: profile } = await supabase
        .from('linkedin_profiles')
        .select('parsed_data')
        .eq('id', linkedinProfileId)
        .single();
      
      if (profile) {
        linkedInData = profile.parsed_data;
      }
    }

    // Check if question bank exists for this role+interview combination
    const { data: existingBank } = await supabase
      .from('interview_question_banks')
      .select('id')
      .eq('job_title', criteria.jobTitle)
      .eq('interview_type', criteria.interviewType)
      .eq('difficulty', criteria.difficulty)
      .single();

    let questionBankId: string | null = null;
    let questionBankUpdatePromise: Promise<string | null> | null = null;

    if (existingBank) {
      questionBankId = existingBank.id;
      console.log(`[Interview Create] Using existing question bank: ${questionBankId}`);
    } else {
      // Generate question bank in the background (non-blocking)
      // This allows the interview to be created immediately
      console.log(`[Interview Create] No question bank found for ${criteria.jobTitle} (${criteria.interviewType}, ${criteria.difficulty}). Will generate in background...`);
      
      // Fire and forget - generate question bank asynchronously
      questionBankUpdatePromise = generateQuestionBank(criteria)
        .then(async (questionBank) => {
          // Store question bank in database
          const { data: newBank, error: bankError } = await supabase
            .from('interview_question_banks')
            .insert({
              job_title: questionBank.jobTitle,
              interview_type: questionBank.interviewType,
              difficulty: questionBank.difficulty,
              focus_areas: questionBank.focusAreas,
              questions: questionBank.questions,
              source_urls: questionBank.sourceUrls,
            })
            .select('id')
            .single();

          if (bankError) {
            console.error('[Interview Create] Error creating question bank:', bankError);
            return null;
          } else {
            console.log(`[Interview Create] Question bank created in background with ${questionBank.questions.length} questions`);
            return newBank.id;
          }
        })
        .catch((error: any) => {
          console.error('[Interview Create] Error generating question bank in background:', error);
          return null;
        });
    }

    // Generate persona to get the meta prompt
    const persona = await generateInterviewerPersona(criteria, linkedInData);

    // Log the meta prompt with full context
    console.log('\n' + '='.repeat(80));
    console.log('INTERVIEW CREATED - META PROMPT');
    console.log('='.repeat(80));
    console.log(`User ID: ${user.id}`);
    console.log(`Job Title: ${criteria.jobTitle}`);
    console.log(`Company: ${criteria.companyName}`);
    console.log(`Interview Type: ${criteria.interviewType}`);
    console.log(`Difficulty: ${criteria.difficulty}`);
    console.log(`Mode: ${criteria.mode}`);
    console.log(`Focus Areas: ${criteria.focusAreas.join(', ')}`);
    console.log(`LinkedIn Profile ID: ${linkedinProfileId || 'None'}`);
    console.log(`Interviewer Name: ${persona.name}`);
    console.log(`Interviewer Pronouns: ${persona.pronouns.join('/')}`);
    console.log(`Communication Style: ${persona.communicationStyle}`);
    console.log('='.repeat(80));
    console.log('META PROMPT (System Prompt):');
    console.log('='.repeat(80));
    console.log(persona.systemPrompt);
    console.log('='.repeat(80));
    console.log('END OF META PROMPT');
    console.log('='.repeat(80) + '\n');

    // Create interview immediately (don't wait for question bank if it's generating)
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        user_id: user.id,
        criteria,
        linkedin_profile_id: linkedinProfileId || null,
        meta_prompt: persona.systemPrompt, // Store the meta prompt once (server-side only)
        question_bank_id: questionBankId, // Link to question bank if available (may be null if generating in background)
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating interview:', error);
      return NextResponse.json(
        { error: 'Failed to create interview' },
        { status: 500 }
      );
    }

    // If question bank is being generated in background, update interview when ready
    if (questionBankUpdatePromise && data?.id) {
      questionBankUpdatePromise.then(async (newQuestionBankId) => {
        if (newQuestionBankId) {
          await supabase
            .from('interviews')
            .update({ question_bank_id: newQuestionBankId })
            .eq('id', data.id);
          console.log(`[Interview Create] Updated interview ${data.id} with question bank ${newQuestionBankId}`);
        }
      }).catch(() => {
        // Ignore errors - question bank generation already logged
      });
    }

    // Remove meta_prompt from response - never expose to client
    if (data && (data as any).meta_prompt) {
      const { meta_prompt, ...sanitizedData } = data as any;
      return NextResponse.json(sanitizedData);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating interview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create interview' },
      { status: 500 }
    );
  }
}

