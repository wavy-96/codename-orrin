import { openai } from './client';
import type { ParsedLinkedInData } from '@/types/linkedin';

export async function parseLinkedInProfile(profileContent: string): Promise<ParsedLinkedInData> {
  const prompt = `You are a LinkedIn profile parser. Extract structured information from the following LinkedIn profile content. 
Return a JSON object with the following structure:
{
  "name": "Full name",
  "role": "Current job title",
  "company": "Current company name",
  "experience": ["Array of previous roles/companies"],
  "gender": "male" | "female" | "other" | null (infer from name/profile if possible, otherwise null),
  "communicationStyle": "Brief description of communication style based on profile",
  "bio": "Profile summary/bio",
  "skills": ["Array of skills mentioned"],
  "education": ["Array of educational background"]
}

LinkedIn Profile Content:
${profileContent}

Return ONLY valid JSON, no additional text or markdown formatting.`;

  try {
    // Data extraction task - use gpt-5-mini for balanced performance and structured output
    // Try multiple models in case one returns empty responses
    const modelsToTry = [
      'gpt-5-mini',                   // Balanced - good for structured data extraction
      'gpt-5-mini-2025-08-07',        // Pinned mini version
      'gpt-5-nano',                   // Fast alternative if mini unavailable
      'gpt-4o-mini',                  // Fallback to GPT-4
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
              content: 'You are a helpful assistant that extracts structured data from LinkedIn profiles. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        });

        if (response.choices?.[0]?.message?.content) {
          console.log(`[LinkedIn Parser] Generated with ${model}`);
          break;
        }
      } catch (error: any) {
        console.warn(`[LinkedIn Parser] Error with model ${model}:`, error.message);
        continue;
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error('All models failed to parse LinkedIn profile');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let parsed: ParsedLinkedInData;
    try {
      parsed = JSON.parse(content) as ParsedLinkedInData;
    } catch (jsonError: any) {
      console.error('[LinkedIn Parser] JSON parse error:', jsonError);
      console.error('[LinkedIn Parser] Content that failed to parse:', content);
      throw new Error(`Invalid JSON response from OpenAI: ${jsonError.message}`);
    }
    
    // Validate required fields
    if (!parsed.name && !parsed.role && !parsed.company) {
      console.warn('[LinkedIn Parser] Parsed data missing key fields:', parsed);
    }
    
    return parsed;
  } catch (error: any) {
    console.error('[LinkedIn Parser] Error parsing LinkedIn profile:', error);
    if (error.message && error.message.includes('Invalid JSON')) {
      throw error; // Re-throw JSON errors with more context
    }
    throw new Error(`Failed to parse LinkedIn profile: ${error.message || 'Unknown error'}`);
  }
}

export async function fetchLinkedInProfile(url: string): Promise<string> {
  // Use OpenAI's browsing capability to fetch LinkedIn profile
  // This uses the Assistants API with browsing tool enabled
  
  try {
    // Create an assistant with browsing capability
    const assistant = await openai.beta.assistants.create({
      name: 'LinkedIn Profile Fetcher',
      instructions: 'You are a web browsing assistant. Fetch the content from the provided LinkedIn profile URL and extract all visible text content including name, job title, company, experience, skills, education, and bio. Return the extracted text content in a readable format.',
      model: 'gpt-4o',
      tools: [{ type: 'file_search' as any }], // Note: browsing tool deprecated, using file_search as placeholder
    });

    // Create a thread and run
    const thread = await openai.beta.threads.create();

    // Add message with the LinkedIn URL
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Please browse and extract all visible content from this LinkedIn profile: ${url}. Extract all text including name, current role, company, experience history, skills, education, and bio. Return the content in a clean, readable format.`,
    });

    // Run the assistant
    let run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Poll for completion
    while (run.status === 'queued' || run.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
          const content = textContent.text.value;
          
          // Clean up assistant
          await openai.beta.assistants.delete(assistant.id);
          
          return content;
        }
      }
    }

    // Clean up assistant
    await openai.beta.assistants.delete(assistant.id);

    if (run.status === 'failed') {
      throw new Error(`Failed to fetch profile: ${run.last_error?.message || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to fetch profile: ${run.status}`);
  } catch (error: any) {
    console.error('Error fetching LinkedIn profile with OpenAI browsing:', error);
    
    // Fallback: Try direct fetch as backup
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return textContent;
      }
    } catch (fallbackError) {
      console.error('Fallback fetch also failed:', fallbackError);
    }

    // If all methods fail, return empty string - user can paste content manually
    return '';
  }
}

