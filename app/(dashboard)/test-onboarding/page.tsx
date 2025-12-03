'use client';

import { useState, useEffect } from 'react';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function TestOnboardingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleResetOnboarding = async () => {
    try {
      const response = await fetch('/api/onboarding/reset', {
        method: 'POST',
      });
      if (response.ok) {
        await fetchProfile();
        setShowForm(false);
        alert('Onboarding reset successfully!');
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Failed to reset onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-warm-sand p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Test Controls */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Onboarding Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => setShowForm(!showForm)}
                variant="outline"
              >
                {showForm ? 'Hide' : 'Show'} Onboarding Form
              </Button>
              <Button
                onClick={fetchProfile}
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh Profile'
                )}
              </Button>
              <Button
                onClick={handleResetOnboarding}
                variant="destructive"
              >
                Reset Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Profile Status */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Current Profile Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-ethics-black" />
              </div>
            ) : profile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Onboarding Completed:</span>
                  <Badge variant={profile.onboarding_completed ? 'default' : 'secondary'}>
                    {profile.onboarding_completed ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Current Job Title:</span>
                    <p className="text-base mt-1">
                      {profile.current_job_title || <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Desired Job Title:</span>
                    <p className="text-base mt-1">
                      {profile.desired_job_title || <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-muted-foreground">Resume ID:</span>
                  <p className="text-base mt-1 font-mono text-sm">
                    {profile.resume_id || <span className="text-muted-foreground italic">No resume uploaded</span>}
                  </p>
                  {profile.candidate_resumes && (
                    <div className="mt-2 p-3 rounded-lg bg-warm-sand/30 border border-black/5">
                      <p className="text-sm">
                        <span className="font-medium">File Name:</span> {profile.candidate_resumes.file_name}
                      </p>
                      {profile.candidate_resumes.parsed_data && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View Parsed Data
                          </summary>
                          <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-48">
                            {JSON.stringify(profile.candidate_resumes.parsed_data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <span className="text-sm font-medium text-muted-foreground">Full Profile Data:</span>
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      View Raw JSON
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-4 rounded border overflow-auto max-h-96">
                      {JSON.stringify(profile, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No profile found. Complete onboarding to create one.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Form */}
        {showForm && (
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Onboarding Form</CardTitle>
            </CardHeader>
            <CardContent>
              <OnboardingForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

