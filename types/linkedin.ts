export interface LinkedInProfile {
  id: string;
  user_id: string;
  profile_url: string;
  parsed_data: ParsedLinkedInData;
  created_at: string;
  updated_at: string;
}

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
  interviewerPersonality?: string; // Summary of interviewer's personality and style from PDF
}

