import { CriteriaForm } from '@/components/setup/criteria-form';

export default function NewInterviewPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Interview</h1>
        <p className="text-muted-foreground mt-2">
          Set up your interview criteria and preferences
        </p>
      </div>
      <CriteriaForm />
    </div>
  );
}

