import { openai } from '@/lib/openai/client';
import { ParsedResumeData } from '@/types/interview';

export async function parseResumePDF(buffer: Buffer): Promise<ParsedResumeData> {
  console.log('[Resume Parser] Starting PDF parsing with OpenAI Responses API...');

  // Create a File object for OpenAI SDK
  const fileForOpenAI = new File([buffer as BlobPart], 'resume.pdf', { type: 'application/pdf' });

  // Step 1: Upload file to OpenAI
  console.log('[Resume Parser] Uploading PDF...');
  const uploadedFile = await openai.files.create({
    file: fileForOpenAI,
    purpose: 'assistants',
  });
  console.log('[Resume Parser] File uploaded:', uploadedFile.id);

  let extractedText = '';

  try {
    // Step 2: Use Responses API for one-shot extraction
    console.log('[Resume Parser] Sending request to Responses API...');
    const startTime = Date.now();
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Analyze this resume PDF and extract all information. Return a JSON object with the following structure:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "summary": "Professional summary or objective",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Time period (e.g., Jan 2020 - Present)",
      "description": "Key responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University name",
      "year": "Graduation year"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "certifications": ["cert1", "cert2"],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description"
    }
  ]
}

Extract as much information as possible. If a field is not present, omit it or use an empty array. Return ONLY the JSON object, no other text.`,
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
    console.log('[Resume Parser] Response structure:', JSON.stringify(response, null, 2).substring(0, 1000));
    
    // Try different ways to extract text from the response
    if (response.output && Array.isArray(response.output) && response.output.length > 0) {
      for (const item of response.output) {
        const itemAny = item as any;
        
        if (itemAny.text && typeof itemAny.text === 'string') {
          extractedText = itemAny.text;
          break;
        }
        
        if (itemAny.content && typeof itemAny.content === 'string') {
          extractedText = itemAny.content;
          break;
        }
        
        if (typeof itemAny === 'string') {
          extractedText = itemAny;
          break;
        }
        
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
    
    // Ensure extractedText is a string
    if (typeof extractedText !== 'string') {
      console.warn('[Resume Parser] extractedText is not a string, converting:', typeof extractedText);
      extractedText = typeof extractedText === 'object' 
        ? JSON.stringify(extractedText) 
        : String(extractedText || '');
    }
    
    const elapsedTime = Date.now() - startTime;
    console.log(`[Resume Parser] Response received in ${elapsedTime}ms`);
    console.log('[Resume Parser] Extracted text length:', extractedText.length);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text extracted from PDF');
    }

    // Cleanup: delete the uploaded file
    console.log('[Resume Parser] Cleaning up uploaded file...');
    await openai.files.delete(uploadedFile.id);
    console.log('[Resume Parser] Cleanup completed');
  } catch (parseError: any) {
    // Cleanup on error
    console.error('[Resume Parser] Error during parsing:', parseError);
    try {
      await openai.files.delete(uploadedFile.id);
    } catch (cleanupError) {
      console.warn('[Resume Parser] Cleanup error:', cleanupError);
    }
    throw new Error(`Failed to parse resume: ${parseError.message}`);
  }

  // Parse the JSON response
  try {
    // Clean up the extracted text - remove markdown code blocks if present
    let jsonText = extractedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsedResume: ParsedResumeData = JSON.parse(jsonText);

    // Validate essential fields
    if (!parsedResume.experience) {
      parsedResume.experience = [];
    }
    if (!parsedResume.education) {
      parsedResume.education = [];
    }
    if (!parsedResume.skills) {
      parsedResume.skills = [];
    }

    return parsedResume;
  } catch (jsonError: any) {
    console.error('[Resume Parser] JSON parse error:', jsonError);
    console.error('[Resume Parser] Raw text:', extractedText.substring(0, 500));
    
    // Return a basic structure with the raw text as summary
    return {
      name: undefined,
      email: undefined,
      phone: undefined,
      summary: extractedText.substring(0, 1000),
      experience: [],
      education: [],
      skills: [],
    };
  }
}
