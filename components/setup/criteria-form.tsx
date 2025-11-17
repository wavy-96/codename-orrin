'use client';

import { useState } from 'react';
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
import { X, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { InterviewType, DifficultyLevel, InterviewMode, InterviewFormat, InterviewDuration } from '@/types/interview';

const formSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  companyName: z.string().optional(),
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
  const [userTier] = useState<'free' | 'paid'>('free'); // TODO: Get from user context/auth

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
      duration: '5',
      format: 'single',
      guidance: '',
    },
  });

  const focusAreas = watch('focusAreas');

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create interview
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: {
            jobTitle: data.jobTitle,
            companyName: data.companyName || 'a leading company',
            focusAreas: data.focusAreas,
            interviewType: data.interviewType,
            difficulty: data.difficulty,
            mode: data.mode,
            duration: Number(data.duration) as InterviewDuration,
            format: data.format as InterviewFormat,
            guidance: data.guidance || undefined,
          },
          linkedinProfileId: parsedLinkedInId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create interview');
      }

      const interviewData = await response.json();
      router.push(`/interview/${interviewData.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Set Up Your Interview</CardTitle>
        <CardDescription>
          Configure your interview criteria and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Select
                onValueChange={(value) => setValue('duration', value as any)}
                defaultValue="5"
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15" disabled={userTier === 'free'}>
                    15 minutes
                  </SelectItem>
                  <SelectItem value="30" disabled={userTier === 'free'}>
                    30 minutes
                  </SelectItem>
                  <SelectItem value="45" disabled={userTier === 'free'}>
                    45 minutes
                  </SelectItem>
                  <SelectItem value="60" disabled={userTier === 'free'}>
                    60 minutes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Interview Format *</Label>
              <Select
                onValueChange={(value) => setValue('format', value as InterviewFormat)}
                defaultValue="single"
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Interview</SelectItem>
                  <SelectItem value="loop" disabled>Loop Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title *</Label>
            <Input
              id="jobTitle"
              {...register('jobTitle')}
              placeholder="e.g., Senior Software Engineer"
              disabled={isSubmitting}
            />
            {errors.jobTitle && (
              <p className="text-sm text-destructive">{errors.jobTitle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name (Optional)</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="e.g., Google (leave blank if unsure)"
              disabled={isSubmitting}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusAreas">Focus Areas *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add skills, topics, or areas you want to focus on (e.g., Leadership, Problem Solving, Communication, Data Analysis, etc.)
            </p>
            <div className="flex gap-2">
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
                placeholder="e.g., Leadership, Problem Solving, Technical Skills"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={addFocusArea}
                disabled={isSubmitting}
              >
                Add
              </Button>
            </div>
            {focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {focusAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1">
                    {area}
                    <button
                      type="button"
                      onClick={() => removeFocusArea(area)}
                      className="ml-1 hover:text-destructive"
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {errors.focusAreas && (
              <p className="text-sm text-destructive">{errors.focusAreas.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="interviewType">Interview Type *</Label>
              <Select
                onValueChange={(value) => setValue('interviewType', value as InterviewType)}
                defaultValue="mixed"
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="system-design">System Design</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level *</Label>
              <Select
                onValueChange={(value) => setValue('difficulty', value as DifficultyLevel)}
                defaultValue="intermediate"
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">Interview Mode *</Label>
            <Select
              onValueChange={(value) => setValue('mode', value as InterviewMode)}
              defaultValue="strict"
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Standard (no hints)</SelectItem>
                <SelectItem value="practice" disabled={userTier === 'free'}>
                  Practice Mode (with hints)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="pdfFile">LinkedIn Profile PDF (Optional)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        To get your LinkedIn PDF: Go to your LinkedIn profile → Click "More" → Select "Save to PDF"
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="pdfFile"
                type="file"
                accept=".pdf,application/pdf"
                disabled={isSubmitting || pdfParsing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handlePDFUpload(file);
                  }
                }}
                className="cursor-pointer"
              />
              {pdfParsing && (
                <p className="text-sm text-muted-foreground">Parsing PDF...</p>
              )}
              {parsedLinkedInId && (
                <p className="text-sm text-green-600">✓ Profile parsed successfully</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="guidance">Interview Prep Notes / Guidance (Optional)</Label>
            <Textarea
              id="guidance"
              {...register('guidance')}
              placeholder="Add any specific guidance, notes, or prep materials for this interview. This will be incorporated into the interviewer's approach..."
              rows={6}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Add any specific points you want the interviewer to focus on, key topics to cover, or prep notes to guide the interview.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Interview...' : 'Start Interview'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

