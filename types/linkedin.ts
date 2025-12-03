/**
 * Parsed data from a LinkedIn profile (URL or PDF upload).
 * 
 * PURPOSE: Used to personalize the AI interviewer to match a real person.
 * 
 * When a user uploads their interviewer's LinkedIn profile, this data is
 * extracted and used to:
 * - Set the interviewer's name, role, and company in the conversation
 * - Choose correct pronouns based on gender (optional, user can skip)
 * - Match the interviewer's communication style
 * - Add personality traits to make the AI feel more realistic
 * 
 * @see lib/openai/interview.ts - generateInterviewerPersona()
 * @see lib/openai/linkedin-parser.ts - parseLinkedInProfile()
 */
export interface ParsedLinkedInData {
  name: string;
  role: string;
  company: string;
  experience: string[];
  gender?: 'male' | 'female' | 'other' | null;
  communicationStyle?: string;
  bio?: string;
  skills?: string[];
  education?: string[];
  interviewerPersonality?: string;
}
