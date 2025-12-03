import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseResumePDF } from '@/lib/openai/resume-parser';

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
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse the resume PDF using OpenAI
    const parsedData = await parseResumePDF(buffer);

    // Derive first and last name from parsed resume
    let firstName: string | null = null;
    let lastName: string | null = null;
    if (parsedData?.name && typeof parsedData.name === 'string') {
      const parts = parsedData.name.trim().split(/\s+/);
      if (parts.length > 0) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || null;
      }
    }

    // Store parsed resume in database
    const { data: resume, error: dbError } = await supabase
      .from('candidate_resumes')
      .insert({
        user_id: user.id,
        file_name: file.name,
        parsed_data: parsedData,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store parsed resume');
    }

    // Optionally update user profile with extracted name
    if (firstName || lastName) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        await supabase
          .from('user_profiles')
          .update({
            first_name: firstName ?? null,
            last_name: lastName ?? null,
          })
          .eq('user_id', user.id);
      } else {
        await supabase.from('user_profiles').insert({
          user_id: user.id,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
        });
      }
    }

    return NextResponse.json({
      id: resume.id,
      fileName: file.name,
      parsedData,
    });
  } catch (error: any) {
    console.error('Error parsing resume PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse resume PDF' },
      { status: 500 }
    );
  }
}

