'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  User, 
  CreditCard, 
  Crown, 
  Calendar, 
  FileText,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserProfileWithResume, SubscriptionStatus } from '@/types/user';

interface UserData {
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileWithResume | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resumeStatus, setResumeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    currentJobTitle: '',
    desiredJobTitle: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, subscriptionRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/stripe/subscription'),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setProfileForm({
          firstName: profileData?.first_name || '',
          lastName: profileData?.last_name || '',
          currentJobTitle: profileData?.current_job_title || '',
          desiredJobTitle: profileData?.desired_job_title || '',
        });
        // Extract email from auth user
        if (profileData.email) {
          setUser({ email: profileData.email });
        }
      }

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json();
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileStatus(null);

    try {
      await updateProfile({
        firstName: profileForm.firstName.trim() || null,
        lastName: profileForm.lastName.trim() || null,
        currentJobTitle: profileForm.currentJobTitle.trim() || null,
        desiredJobTitle: profileForm.desiredJobTitle.trim() || null,
      });
      setProfileStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error: any) {
      console.error('Profile update error:', error);
      setProfileStatus({ type: 'error', message: error.message || 'Failed to update profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const syncProfileState = (data: any) => {
    setProfile(data);
    setProfileForm({
      firstName: data?.first_name || '',
      lastName: data?.last_name || '',
      currentJobTitle: data?.current_job_title || '',
      desiredJobTitle: data?.desired_job_title || '',
    });
  };

  const updateProfile = async (payload: {
    firstName?: string | null;
    lastName?: string | null;
    currentJobTitle?: string | null;
    desiredJobTitle?: string | null;
    resumeId?: string | null;
  }) => {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: (payload.firstName ?? profileForm.firstName.trim()) || null,
          lastName: (payload.lastName ?? profileForm.lastName.trim()) || null,
          currentJobTitle: (payload.currentJobTitle ?? profileForm.currentJobTitle.trim()) || null,
          desiredJobTitle: (payload.desiredJobTitle ?? profileForm.desiredJobTitle.trim()) || null,
          resumeId: payload.resumeId ?? profile?.resume_id ?? null,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }

    syncProfileState(data);
    return data;
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeStatus(null);
    setIsUploadingResume(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/resume/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse resume PDF');
      }

      await updateProfile({ resumeId: data.id });
      setResumeStatus({ type: 'success', message: 'Resume updated successfully.' });
      setIsEditingResume(false);
    } catch (error: any) {
      console.error('Resume upload error:', error);
      setResumeStatus({ type: 'error', message: error.message || 'Failed to upload resume.' });
    } finally {
      setIsUploadingResume(false);
      event.target.value = '';
    }
  };

  const handleResumeRemove = async () => {
    setResumeStatus(null);
    setIsUploadingResume(true);
    try {
      await updateProfile({ resumeId: null });
      setResumeStatus({ type: 'success', message: 'Resume removed.' });
      setIsEditingResume(false);
    } catch (error: any) {
      console.error('Resume remove error:', error);
      setResumeStatus({ type: 'error', message: error.message || 'Failed to remove resume.' });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsManaging(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Canceled</Badge>;
      default:
        return <Badge className="bg-warm-sand text-ethics-black border-black/10">Free</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-sand flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ethics-black" />
      </div>
    );
  }

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-warm-sand p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ethics-black">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and subscription</p>
        </div>

        {/* Profile Section */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-ethics-black/10 flex items-center justify-center">
                <User className="h-5 w-5 text-ethics-black" />
              </div>
              <div>
                <CardTitle className="text-xl font-serif">Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleProfileSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    First Name
                  </Label>
                  <Input
                    value={profileForm.firstName}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="e.g. Alex"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Name
                  </Label>
                  <Input
                    value={profileForm.lastName}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="e.g. Johnson"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Current Job Title
                  </Label>
                  <Input
                    value={profileForm.currentJobTitle}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, currentJobTitle: e.target.value }))
                    }
                    placeholder="e.g. Senior Product Manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Target Job Title
                  </Label>
                  <Input
                    value={profileForm.desiredJobTitle}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, desiredJobTitle: e.target.value }))
                    }
                    placeholder="e.g. Director of Product"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Resume
                  </Label>
                  <div className="flex items-center gap-2">
                    {profile?.candidate_resumes?.file_name && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResumeRemove}
                        disabled={isUploadingResume}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingResume(true)}
                      disabled={isUploadingResume}
                      aria-label="Change resume"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {profile?.candidate_resumes?.file_name ? (
                  <div className="p-3 rounded-lg bg-warm-sand/30 border border-black/5 flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{profile.candidate_resumes.file_name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
                )}

                {isEditingResume && (
                  <div className="space-y-2 rounded-lg border border-dashed border-black/10 p-4 bg-warm-sand/20">
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleResumeUpload}
                      disabled={isUploadingResume}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Upload a PDF resume to personalize interviews.</span>
                      <button
                        type="button"
                        className="text-ethics-black hover:underline"
                        onClick={() => {
                          setIsEditingResume(false);
                          setResumeStatus(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!profile?.candidate_resumes?.file_name && !isEditingResume && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingResume(true)}
                    disabled={isUploadingResume}
                  >
                    Upload resume
                  </Button>
                )}
              </div>

              {resumeStatus && (
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm',
                    resumeStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  )}
                >
                  {resumeStatus.message}
                </div>
              )}

              {profileStatus && (
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm',
                    profileStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  )}
                >
                  {profileStatus.message}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-ethics-black text-white hover:bg-ethics-black/90"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                isPro ? 'bg-gradient-to-br from-amber-100 to-orange-100' : 'bg-ethics-black/10'
              }`}>
                {isPro ? (
                  <Crown className="h-5 w-5 text-amber-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-ethics-black" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl font-serif">Subscription</CardTitle>
                <CardDescription>Manage your plan and billing</CardDescription>
              </div>
              {getStatusBadge(subscription?.status || 'free')}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="p-4 rounded-lg bg-warm-sand/30 border border-black/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">
                    {isPro ? 'Pro Plan' : 'Free Plan'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isPro ? '$19.99/month' : 'Limited features'}
                  </p>
                </div>
                {isPro ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Button 
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    size="sm"
                    className="bg-ethics-black hover:bg-ethics-black/90"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-warm-sand/30 border border-black/5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Interviews This Month
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {subscription?.interviewsUsed || 0}
                  <span className="text-lg text-muted-foreground font-normal">
                    {' / '}
                    {isPro ? '∞' : subscription?.interviewsLimit || 3}
                  </span>
                </div>
              </div>

              {isPro && subscription?.currentPeriodEnd && (
                <div className="p-4 rounded-lg bg-warm-sand/30 border border-black/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Next Billing Date
                    </span>
                  </div>
                  <div className="text-lg font-medium">
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                </div>
              )}
            </div>

            {/* Past Due Warning */}
            {subscription?.status === 'past_due' && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Payment Failed</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Your last payment failed. Please update your payment method to continue using Pro features.
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Billing Actions */}
            <div className="flex flex-wrap gap-3">
              {isPro && (
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={isManaging}
                >
                  {isManaging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Billing
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={() => router.push('/pricing')}
              >
                View Plans
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isPro 
                ? 'Manage your subscription, update payment methods, and view invoices in the billing portal.'
                : 'Upgrade to Pro for unlimited interview practice sessions.'
              }
            </p>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

