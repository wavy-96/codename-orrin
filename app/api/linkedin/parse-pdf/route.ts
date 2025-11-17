import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai/client';
import { parseLinkedInProfile } from '@/lib/openai/linkedin-parser';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    console.log('[PDF Parse API] Starting PDF parsing with OpenAI Responses API...');
    console.log('[PDF Parse API] File:', file.name, 'Size:', file.size);

    // Convert File to Buffer for OpenAI upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a File object for OpenAI SDK
    const fileForOpenAI = new File([buffer], file.name, { type: 'application/pdf' });

    // Step 1: Upload file to OpenAI
    console.log('[PDF Parse API] Uploading PDF...');
    const uploadedFile = await openai.files.create({
      file: fileForOpenAI,
      purpose: 'assistants',
    });
    console.log('[PDF Parse API] File uploaded:', uploadedFile.id);

    let extractedText = '';

    try {
      // Step 2: Use Responses API for one-shot extraction
      console.log('[PDF Parse API] Sending request to Responses API...');
      const startTime = Date.now();
      const response = await openai.responses.create({
        model: 'gpt-5-mini', // PDF parsing - use gpt-5-mini for balanced performance
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Analyze this PDF profile/resume and create a concise 2-3 paragraph summary of this person's job history,personality and interviewing style. Focus on: current role, company, communication style, personality traits affecting interviews, what they value in candidates, and interview approach. Include name, role, and company. Be brief and direct.`,
              },
              {
                type: 'input_file',
                file_id: uploadedFile.id,
              },
            ],
          },
        ],
      });

      // Extract text from response output - handle different response structures
      console.log('[PDF Parse API] Response structure:', JSON.stringify(response, null, 2).substring(0, 1000));
      
      // Try different ways to extract text from the response
      if (response.output && Array.isArray(response.output) && response.output.length > 0) {
        // Look for text in output items
        for (const item of response.output) {
          const itemAny = item as any;
          
          // Check if item has text property
          if (itemAny.text && typeof itemAny.text === 'string') {
            extractedText = itemAny.text;
            break;
          }
          
          // Check if item has content property
          if (itemAny.content && typeof itemAny.content === 'string') {
            extractedText = itemAny.content;
            break;
          }
          
          // Check if item itself is a string
          if (typeof itemAny === 'string') {
            extractedText = itemAny;
            break;
          }
          
          // Check nested structures
          if (itemAny.message && typeof itemAny.message === 'string') {
            extractedText = itemAny.message;
            break;
          }
          
          if (itemAny.message?.content && typeof itemAny.message.content === 'string') {
            extractedText = itemAny.message.content;
            break;
          }
        }
      }
      
      // Fallback to output_text if available
      if (!extractedText && (response as any).output_text) {
        extractedText = String((response as any).output_text);
      }
      
      // Last resort: stringify the entire output if it's an object
      if (!extractedText && response.output) {
        if (typeof response.output === 'string') {
          extractedText = response.output;
        } else if (Array.isArray(response.output) && response.output.length > 0) {
          // Try to extract any string values from the array
          const strings = response.output
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item?.text) return String(item.text);
              if (item?.content) return String(item.content);
              return null;
            })
            .filter(Boolean);
          extractedText = strings.join('\n');
        }
      }
      
      // Ensure extractedText is a string (not an object)
      if (typeof extractedText !== 'string') {
        console.warn('[PDF Parse API] extractedText is not a string, converting:', typeof extractedText);
        extractedText = typeof extractedText === 'object' 
          ? JSON.stringify(extractedText) 
          : String(extractedText || '');
      }
      
      const elapsedTime = Date.now() - startTime;
      console.log(`[PDF Parse API] Response received in ${elapsedTime}ms`);
      console.log('[PDF Parse API] Extracted text length:', extractedText.length);
      if (extractedText.length > 0) {
        console.log('[PDF Parse API] Extracted text preview (first 500 chars):', extractedText.substring(0, 500));
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text extracted from PDF');
      }

      // Cleanup: delete the uploaded file
      console.log('[PDF Parse API] Cleaning up uploaded file...');
      await openai.files.delete(uploadedFile.id);
      console.log('[PDF Parse API] Cleanup completed');
    } catch (parseError: any) {
      // Cleanup on error
      console.error('[PDF Parse API] Error during parsing:', parseError);
      try {
        await openai.files.delete(uploadedFile.id);
      } catch (cleanupError) {
        console.warn('[PDF Parse API] Cleanup error:', cleanupError);
      }
      throw parseError;
    }

    // Format the extracted text as interviewer personality summary
    console.log('[PDF Parse API] Formatting as interviewer personality summary...');
    const parsedData = {
      name: extractedText.match(/^[A-Z][a-z]+ [A-Z][a-z]+/)?.[0] || 'Unknown',
      role: extractedText.match(/(?:role|position|title)[:]\s*([^\n]+)/i)?.[1] || '',
      company: extractedText.match(/(?:company|at)[:]\s*([^\n]+)/i)?.[1] || '',
      interviewerPersonality: extractedText.trim(),
      // Keep structure compatible with existing code
      experience: [],
      gender: null,
      communicationStyle: extractedText.match(/(?:communication|style)[:]\s*([^\n]+)/i)?.[1] || '',
      bio: extractedText.trim(),
      skills: [],
      education: [],
    };
    console.log('[PDF Parse API] Interviewer personality summary created');

    // Check if profile already exists for this user
    const { data: existingProfile } = await supabase
      .from('linkedin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('profile_url', `pdf:${file.name}`)
      .single();

    let profileId: string;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('linkedin_profiles')
        .update({
          parsed_data: parsedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (error) throw error;
      profileId = data.id;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('linkedin_profiles')
        .insert({
          user_id: user.id,
          profile_url: `pdf:${file.name}`,
          parsed_data: parsedData,
        })
        .select()
        .single();

      if (error) throw error;
      profileId = data.id;
    }

    return NextResponse.json({
      id: profileId,
      parsedData,
    });
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}

