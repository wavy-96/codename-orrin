'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Upload, X, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

const formSchema = z.object({
  currentJobTitle: z.string().min(1, 'Current job title is required'),
  desiredJobTitle: z.string().min(1, 'Desired job title is required'),
});

type FormData = z.infer<typeof formSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const currentJobTitle = watch('currentJobTitle');
  const desiredJobTitle = watch('desiredJobTitle');

  // Step 1: Resume upload
  const step1Complete = resumeUploaded && !!resumeId;
  // Step 2: Current job title (auto-populated from resume)
  const step2Complete = step1Complete && !!currentJobTitle && currentJobTitle.trim().length > 0;
  // Step 3: Desired job title
  const step3Complete = step2Complete && !!desiredJobTitle && desiredJobTitle.trim().length > 0;

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

      setResumeId(data.id);
      setResumeUploaded(true);

      // Auto-populate current job title from resume if available
      if (data.parsedData) {
        // Try to get from most recent experience first
        if (data.parsedData.experience && data.parsedData.experience.length > 0) {
          const currentRole = data.parsedData.experience[0];
          if (currentRole && currentRole.title) {
            setValue('currentJobTitle', currentRole.title);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume PDF');
      setResumeFile(null);
    } finally {
      setResumeParsing(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    // Validate resume is uploaded
    if (!resumeId || !resumeUploaded) {
      setError('Please upload your resume in PDF format to continue.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentJobTitle: data.currentJobTitle,
          desiredJobTitle: data.desiredJobTitle,
          resumeId: resumeId,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-sand p-4">
      <Card className="w-full max-w-2xl border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-3xl font-serif">Welcome to Interview Prep</CardTitle>
          <CardDescription className="text-base">
            Let's set up your profile to get personalized interview practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Resume Upload */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-ethics-black text-white flex items-center justify-center font-serif">1</div>
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="resumeFile" className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Resume *
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start" sideOffset={8} className="max-w-xs">
                        <p className="text-sm">
                          Please upload your resume in PDF format. This will be used to personalize your interview questions based on your experience. You can update it later.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {resumeUploaded && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Uploaded
                    </span>
                  )}
                </div>
              </div>
              
              {resumeFile && !resumeUploaded && !resumeParsing && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warm-sand/30 border border-black/5">
                  <span className="text-sm flex-1 truncate">{resumeFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResumeFile(null);
                      setResumeUploaded(false);
                    }}
                    disabled={resumeParsing}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!resumeFile && !resumeParsing && (
                <div className="relative">
                  <Input
                    id="resumeFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={isSubmitting || resumeParsing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setResumeFile(file);
                        handleResumeUpload(file);
                      }
                    }}
                    className="cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ethics-black file:text-white hover:file:bg-ethics-black/90 h-auto py-2"
                  />
                </div>
              )}
              
                  {resumeParsing && (
                <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-warm-sand/30 border border-black/5 space-y-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-ethics-black/20 border-t-ethics-black animate-spin" />
                    <Upload className="h-5 w-5 text-ethics-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-ethics-black">Analyzing your resume...</p>
                    {resumeFile && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{resumeFile.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                  </div>
                    </div>
                  )}
              {resumeUploaded && resumeFile && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate text-green-800">{resumeFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResumeFile(null);
                      setResumeUploaded(false);
                      setResumeId(null);
                      setValue('currentJobTitle', '');
                    }}
                    disabled={isSubmitting}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!resumeUploaded && !resumeParsing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Please upload your resume in PDF format to continue.
                </p>
              )}
            </div>

            {/* Step 2: Current Job Title - Progressive Disclosure (Auto-populated from resume) */}
            {step1Complete && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="h-px w-full bg-black/5" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-ethics-black text-white flex items-center justify-center font-serif">2</div>
                  <Label htmlFor="currentJobTitle" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Current Job Title *
                  </Label>
                </div>
                <Input
                  id="currentJobTitle"
                  {...register('currentJobTitle')}
                  placeholder="e.g. Software Engineer"
                  disabled={isSubmitting}
                  className="h-12 text-lg bg-warm-sand/30 border-black/5 focus:border-ethics-black/20 focus:ring-0 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentJobTitle?.trim()) {
                      e.preventDefault();
                      // Focus next field when it appears
                      setTimeout(() => {
                        const nextInput = document.getElementById('desiredJobTitle');
                        nextInput?.focus();
                      }, 100);
                    }
                  }}
                />
                {errors.currentJobTitle && (
                  <p className="text-sm text-destructive">{errors.currentJobTitle.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  This was auto-filled from your resume. You can edit it if needed.
                </p>
              </div>
            )}

            {/* Step 3: Desired Job Title - Progressive Disclosure */}
            {step2Complete && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="h-px w-full bg-black/5" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-ethics-black text-white flex items-center justify-center font-serif">3</div>
                  <Label htmlFor="desiredJobTitle" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Desired Job Title *
                  </Label>
                </div>
                <Input
                  id="desiredJobTitle"
                  {...register('desiredJobTitle')}
                  placeholder="e.g. Senior Product Manager"
                  disabled={isSubmitting}
                  className="h-12 text-lg bg-warm-sand/30 border-black/5 focus:border-ethics-black/20 focus:ring-0 transition-all"
                />
                {errors.desiredJobTitle && (
                  <p className="text-sm text-destructive">{errors.desiredJobTitle.message}</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                {error}
              </div>
            )}

            {/* Submit Button - Only show after step 3 (desired job title) is complete */}
            {step3Complete && (
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-ethics-black text-white hover:bg-ethics-black/90 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-top-4 duration-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

