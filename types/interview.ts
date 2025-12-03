export type InterviewType = 'technical' | 'behavioral' | 'system-design' | 'mixed';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type InterviewMode = 'practice' | 'strict';

export type InterviewStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export type InterviewFormat = 'single' | 'loop'; // Single interview vs loop interview

export type InterviewDuration = 5 | 10 | 15 | 30 | 45 | 60; // Minutes

export interface InterviewCriteria {
  jobTitle: string;
  companyName?: string;
  focusAreas: string[];
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  mode: InterviewMode;
  duration: InterviewDuration;
  format: InterviewFormat;
  guidance?: string;
  jobDescription?: string;
}

/** Structured data extracted from a candidate's resume PDF */
export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
  skills: string[];
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
  }>;
}

export interface Interview {
  id: string;
  user_id: string;
  criteria: InterviewCriteria;
  linkedin_profile_id: string | null;
  candidate_resume_id: string | null;
  job_description: string | null;
  status: InterviewStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateResume {
  id: string;
  user_id: string;
  file_name: string;
  parsed_data: ParsedResumeData;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  interview_id: string;
  role: 'user' | 'interviewer';
  message: string;
  timestamp: string;
  audio_url: string | null;
}

export interface CriteriaScore {
  criteria: string;
  score: number; // 0-100
  feedback: string;
}

export interface Evaluation {
  id: string;
  interview_id: string;
  criteria_scores: CriteriaScore[];
  overall_score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  created_at: string;
}

