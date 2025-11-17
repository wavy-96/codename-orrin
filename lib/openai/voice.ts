import { openai } from './client';

export async function textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<Buffer> {
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw new Error('Failed to convert text to speech');
  }
}

export async function speechToText(audioBuffer: Buffer, language: string = 'en'): Promise<string> {
  try {
    // Create a File-like object from the buffer
    const file = new File([audioBuffer as any], 'audio.webm', { type: 'audio/webm' });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
    });

    return response.text;
  } catch (error) {
    console.error('Error converting speech to text:', error);
    throw new Error('Failed to convert speech to text');
  }
}

