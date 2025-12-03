'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Info, Loader2, Check, Crown, Pencil, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UpgradeModal } from '@/components/subscription/upgrade-modal';
import { Progress } from '@/components/ui/progress';
import type { InterviewType, DifficultyLevel, InterviewMode, InterviewFormat, InterviewDuration } from '@/types/interview';
import type { SubscriptionStatus } from '@/types/user';

const formSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  companyName: z.string().optional(),
  jobDescription: z.string().optional(),
  focusAreas: z.array(z.string()).min(1, 'At least one focus area is required'),
  interviewType: z.enum(['technical', 'behavioral', 'system-design', 'mixed']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  mode: z.enum(['practice', 'strict']),
  duration: z.enum(['5', '10', '15', '30', '45', '60']),
  format: z.enum(['single', 'loop']),
  linkedinProfileContent: z.string().optional(),
  guidance: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CriteriaFormProps {
  linkedinProfileId?: string | null;
}

export function CriteriaForm({ linkedinProfileId }: CriteriaFormProps) {
  const router = useRouter();
  const [focusAreaInput, setFocusAreaInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [parsedLinkedInId, setParsedLinkedInId] = useState<string | null>(linkedinProfileId || null);
  const [parsedResumeId, setParsedResumeId] = useState<string | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [profileResumeId, setProfileResumeId] = useState<string | null>(null);
  const [profileResumeFileName, setProfileResumeFileName] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Fetch user profile and subscription on mount
  useEffect(() => {
    const fetchProfileAndSubscription = async () => {
      try {
        // Fetch both in parallel
        const [profileRes, subscriptionRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/stripe/subscription'),
        ]);
        
        // Handle profile response
        const profileContentType = profileRes.headers.get('content-type');
        if (profileContentType && profileContentType.includes('application/json')) {
          const profile = await profileRes.json();
        if (profile && profile.resume_id) {
          setProfileResumeId(profile.resume_id);
            setParsedResumeId(profile.resume_id);
          if (profile.candidate_resumes) {
            setProfileResumeFileName(profile.candidate_resumes.file_name);
          }
          }
        }
        
        // Handle subscription response
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json();
          setSubscription(subscriptionData);
        }
      } catch (error) {
        console.error('Error fetching profile/subscription:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileAndSubscription();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      focusAreas: [],
      interviewType: 'mixed',
      difficulty: 'intermediate',
      mode: 'strict',
      duration: '5', // Default to 5 min (quick)
      format: 'single',
      guidance: '',
    },
  });

  const focusAreas = watch('focusAreas');
  const jobTitle = watch('jobTitle');

  const step1Complete = !!jobTitle && jobTitle.trim().length > 0;
  const step2Complete = step1Complete && focusAreas.length > 0;
  const totalSteps = 3;
  const progressValue = (activeStep / totalSteps) * 100;

  const isPro =
    subscription?.plan === 'pro' &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const extractCompanyFromJobDescription = (description?: string | null): string | null => {
    if (!description) return null;
    // Look for explicit company lines, e.g. "Company: OpenAI"
    const companyLineMatch = description.match(
      /(company|company name)\s*[:\-]\s*([A-Za-z0-9&.,\- ]{2,80})/i
    );
    if (companyLineMatch?.[2]) {
      return companyLineMatch[2].trim();
    }
    // Heuristic: look for "at <Company Name>"
    const atMatch = description.match(
      /\bat\s+([A-Z][A-Za-z0-9&.,\-]*(?:\s+[A-Z][A-Za-z0-9&.,\-]*){0,3})/
    );
    if (atMatch?.[1]) {
      return atMatch[1].trim();
    }
    return null;
  };

  const addFocusArea = () => {
    if (focusAreaInput.trim() && !focusAreas.includes(focusAreaInput.trim())) {
      setValue('focusAreas', [...focusAreas, focusAreaInput.trim()]);
      setFocusAreaInput('');
    }
  };

  const removeFocusArea = (area: string) => {
    setValue(
      'focusAreas',
      focusAreas.filter((a) => a !== area)
    );
  };


  const handlePDFUpload = async (file: File) => {
    if (!file) return;

    setPdfParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/linkedin/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF');
      }

      setParsedLinkedInId(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to parse PDF');
    } finally {
      setPdfParsing(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!file) return;

    setResumeParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/resume/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse resume PDF');
      }

      setParsedResumeId(data.id);
      
      // Update user profile with new resume
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: data.id }),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume PDF');
    } finally {
      setResumeParsing(false);
    }
  };

  const handleRemoveResume = async () => {
    setParsedResumeId(null);
    setProfileResumeId(null);
    setProfileResumeFileName(null);
    
    // Update user profile to remove resume
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: null }),
      });
    } catch (err) {
      console.error('Error removing resume from profile:', err);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Derive company name: user input > job description > default OpenAI
      let companyName =
        data.companyName && data.companyName.trim().length > 0
          ? data.companyName.trim()
          : extractCompanyFromJobDescription(data.jobDescription) || 'OpenAI';

      // Create interview
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: {
            jobTitle: data.jobTitle,
            companyName,
            focusAreas: data.focusAreas,
            interviewType: data.interviewType,
            difficulty: data.difficulty,
            mode: data.mode,
            duration: Number(data.duration) as InterviewDuration,
            format: data.format as InterviewFormat,
            guidance: data.guidance || undefined,
            jobDescription: data.jobDescription || undefined,
          },
          linkedinProfileId: parsedLinkedInId,
          candidateResumeId: parsedResumeId,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      const responseData = await response.json();

      if (!response.ok) {
        // Check if it's a subscription limit error
        if (responseData.code === 'SUBSCRIPTION_LIMIT_REACHED') {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(responseData.error || 'Failed to create interview');
      }

      router.push(`/interview/${responseData.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar for interview setup */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
          <span>Interview Setup Progress</span>
          <span>
            Step {activeStep} of {totalSteps}
          </span>
        </div>
        <Progress
          value={progressValue}
          className="h-2 bg-black/5 [&>[data-slot=progress-indicator]]:bg-ethics-black"
        />
      </div>

      {/* Subscription Status Banner */}
      {subscription && subscription.plan === 'free' && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {subscription.interviewsUsed} of {subscription.interviewsLimit} free interviews used
              </p>
              <p className="text-xs text-amber-700">
                Upgrade to Pro for unlimited practice sessions
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => router.push('/pricing')}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Upgrade
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Step 1: Target Role & Resume */}
      {activeStep === 1 && (
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden relative z-30">
          <CardContent className="p-8 space-y-8">
            {/* Job Details Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-ethics-black text-white flex items-center justify-center font-serif">
                    1
                  </div>
                  <h3 className="text-xl font-serif font-medium">Target Role</h3>
                </div>
                <button
                  type="button"
                  onClick={() => step1Complete && setActiveStep(2)}
                  disabled={!step1Complete}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-ethics-black/70 hover:text-ethics-black hover:bg-warm-sand/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next step"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    {...register('jobTitle')}
                    placeholder="e.g. Senior Product Manager"
                    disabled={isSubmitting}
                    className="h-12 text-lg bg-warm-sand/30 border-black/5 focus:border-ethics-black/20 focus:ring-0 transition-all"
                  />
                  {errors.jobTitle && (
                    <p className="text-sm text-destructive">{errors.jobTitle.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Company</Label>
                   <Input
                    id="companyName"
                    {...register('companyName')}
                    placeholder="Target Company"
                    disabled={isSubmitting}
                    className="h-12 text-lg bg-warm-sand/30 border-black/5 focus:border-ethics-black/20 focus:ring-0 transition-all"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  {...register('jobDescription')}
                  placeholder="Paste the job description here to help tailor the interview questions..."
                  rows={4}
                  disabled={isSubmitting}
                  className="bg-warm-sand/30 border-black/5 focus:border-ethics-black/20 focus:ring-0 transition-all"
                />
              </div>

              {/* Candidate Resume Upload */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="resumeFile" className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Resume
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start" sideOffset={8} className="max-w-xs">
                        <p className="text-sm">
                          Upload your resume as a PDF. It will be saved to your profile and used to personalize this interview.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {profileResumeId && parsedResumeId === profileResumeId && (
                  <div className="mb-3 p-3 rounded-lg bg-warm-sand/30 border border-black/5 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profileResumeFileName || 'Profile Resume'}</p>
                      <p className="text-xs text-muted-foreground">Profile resume in use for this interview</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingResume(true)}
                      disabled={isSubmitting || resumeParsing || isLoadingProfile}
                      aria-label="Edit resume"
                      className="flex-shrink-0 text-muted-foreground hover:text-ethics-black"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {isEditingResume && (
                  <div className="space-y-2 rounded-lg border border-dashed border-black/10 p-4 bg-warm-sand/20">
                    <Input
                      id="resumeFile"
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={isSubmitting || resumeParsing || isLoadingProfile}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleResumeUpload(file);
                      }}
                      className="cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ethics-black file:text-white hover:file:bg-ethics-black/90 h-auto py-2"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Upload a PDF resume to personalize questions.</span>
                      <button
                        type="button"
                        className="text-ethics-black hover:underline"
                        onClick={() => setIsEditingResume(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div>

          </CardContent>
        </Card>
      )}

      {/* Step 2: Focus Areas */}
      {activeStep === 2 && (
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden relative z-20">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-ethics-black text-white flex items-center justify-center font-serif">
                  2
                </div>
                <h3 className="text-xl font-serif font-medium">Focus Areas *</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-ethics-black/70 hover:text-ethics-black hover:bg-warm-sand/40"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => step2Complete && setActiveStep(3)}
                  disabled={!step2Complete}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-ethics-black/70 hover:text-ethics-black hover:bg-warm-sand/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next step"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    id="focusAreas"
                    value={focusAreaInput}
                    onChange={(e) => setFocusAreaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFocusArea();
                      }
                    }}
                    placeholder="Type a skill (e.g. Leadership, SQL, Strategy) and press Enter"
                    disabled={isSubmitting}
                    className="h-12 pl-4 pr-20 bg-warm-sand/30 border-black/5"
                  />
                  <Button
                    type="button"
                    onClick={addFocusArea}
                    disabled={isSubmitting || !focusAreaInput.trim()}
                    size="sm"
                    className="absolute right-1 top-1 h-10 bg-ethics-black text-white hover:bg-ethics-black/80"
                  >
                    Add
                  </Button>
                </div>

                {focusAreas.length > 0 ? (
                  <div className="min-h-[60px] p-4 rounded-lg bg-warm-sand/30 border border-black/5">
                    <div className="flex flex-wrap gap-2">
                      {focusAreas.map((area) => (
                        <Badge
                          key={area}
                          variant="secondary"
                          className="h-8 px-3 text-sm bg-white border border-black/5 shadow-sm hover:bg-white/80 transition-colors flex items-center gap-2"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => removeFocusArea(area)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            disabled={isSubmitting}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {errors.focusAreas && (
                  <p className="text-sm text-destructive">{errors.focusAreas.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Step 3: Configuration */}
      {activeStep === 3 && (
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden relative z-10">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-ethics-black text-white flex items-center justify-center font-serif">
                    3
                  </div>
                  <h3 className="text-xl font-serif font-medium">Configuration</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-ethics-black/70 hover:text-ethics-black hover:bg-warm-sand/40"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Career Level
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('difficulty', value as DifficultyLevel)}
                      defaultValue="intermediate"
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10 bg-warm-sand/30 border-black/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">New Grad</SelectItem>
                        <SelectItem value="intermediate">Senior</SelectItem>
                        <SelectItem value="advanced">Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Duration
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('duration', value as any)}
                      defaultValue="5"
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10 bg-warm-sand/30 border-black/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 min (Quick)</SelectItem>
                        <SelectItem value="10" disabled={!isPro}>
                          10 min
                        </SelectItem>
                        <SelectItem value="15" disabled={!isPro}>
                          15 min
                        </SelectItem>
                        <SelectItem value="30" disabled={!isPro}>
                          30 min
                        </SelectItem>
                        <SelectItem value="45" disabled={!isPro}>
                          45 min
                        </SelectItem>
                        <SelectItem value="60" disabled={!isPro}>
                          60 min
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="interviewType"
                      className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Interview Style
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('interviewType', value as InterviewType)}
                      defaultValue="mixed"
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10 bg-warm-sand/30 border-black/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                        <SelectItem value="behavioral">Behavioral Only</SelectItem>
                        <SelectItem value="technical">Technical Only</SelectItem>
                        <SelectItem value="system-design">System Design</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resume Upload (Compact) */}
                <div className="pt-4 space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="guidance"
                      className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Additional Guidance / Prep Material
                    </Label>
                    <Textarea
                      id="guidance"
                      {...register('guidance')}
                      placeholder="Add any specific guidance, notes, or prep materials for this interview..."
                      rows={4}
                      disabled={isSubmitting}
                      className="bg-warm-sand/30 border-black/5 focus:border-ethics-black/20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label
                        htmlFor="pdfFile"
                        className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2"
                      >
                        Hiring Manager Profile PDF
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Upload the LinkedIn PDF of the person interviewing you to simulate their personality.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {parsedLinkedInId && (
                        <span className="text-xs text-green-600 font-medium">✓ Attached</span>
                      )}
                    </div>
                    <Input
                      id="pdfFile"
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={isSubmitting || pdfParsing}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePDFUpload(file);
                      }}
                      className="cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ethics-black file:text-white hover:file:bg-ethics-black/90 h-auto py-2"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step2Complete && (
          <div className="flex justify-center">
            <Button
              type="submit"
              className="w-full max-w-sm h-12 text-base font-medium bg-ethics-black text-white hover:bg-ethics-black/90 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-top-4 duration-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start interview'
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        interviewsUsed={subscription?.interviewsUsed}
        interviewsLimit={subscription?.interviewsLimit}
      />
    </div>
  );
}

