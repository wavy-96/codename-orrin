import type { ParsedLinkedInData } from '@/types/linkedin';

export async function parsePDFContent(pdfContent: string): Promise<ParsedLinkedInData> {
  // Parse extracted PDF text using the LinkedIn profile parser
  const { parseLinkedInProfile } = await import('./linkedin-parser');
  return parseLinkedInProfile(pdfContent);
}

