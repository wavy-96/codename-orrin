# Interview Prep Tool

A voice-based interview preparation tool that allows you to practice interviews with AI-powered interviewers. The tool can emulate specific hiring managers based on their LinkedIn profiles and provides detailed analytics on your performance.

## Features

- 🎤 **Voice-based interviews** using OpenAI Realtime API
- 👔 **LinkedIn profile integration** to emulate real interviewers
- 📄 **Resume parsing** for personalized interview questions
- 📊 **Performance analytics** and detailed evaluation
- 📱 **Mobile-friendly** responsive design
- 🔐 **Secure authentication** with Supabase
- 💳 **Subscription management** with Stripe
- 💾 **Conversation history** and tracking

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Voice**: OpenAI Realtime API
- **LLM**: OpenAI GPT-4
- **Payments**: Stripe
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- Supabase account
- OpenAI API key
- Stripe account (for payments)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd interview_prepper
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Fill in your environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `NEXT_PUBLIC_APP_URL` | Your app URL (http://localhost:3000 for local) |
| `STRIPE_SECRET_KEY` | Your Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key |

4. Set up Supabase database:
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` in order

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
interview_prepper/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes (login, signup)
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── history/       # Interview history
│   │   ├── interview/     # Interview session
│   │   ├── new-interview/ # Start new interview
│   │   ├── onboarding/    # User onboarding flow
│   │   ├── pricing/       # Subscription pricing
│   │   └── settings/      # User settings
│   └── api/               # API routes
│       ├── interview/     # Interview CRUD & realtime
│       ├── stripe/        # Stripe webhooks & checkout
│       ├── user/          # User profile management
│       └── onboarding/    # Onboarding completion
├── components/            # React components
│   ├── analytics/        # Analytics & summaries
│   ├── auth/             # Authentication (logout)
│   ├── interview/        # Interview UI & voice
│   ├── landing/          # Landing page sections
│   ├── navigation/       # Navbar & sidebar
│   ├── onboarding/       # Onboarding flow
│   ├── setup/            # Interview setup forms
│   ├── subscription/     # Upgrade modals
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── evaluation/       # Interview evaluation logic
│   ├── openai/           # OpenAI client & helpers
│   ├── stripe/           # Stripe client & subscriptions
│   ├── supabase/         # Supabase clients (browser/server)
│   └── utils/            # Browser compatibility helpers
├── types/                 # TypeScript type definitions
├── supabase/             # Database migrations
└── scripts/              # Utility scripts
```

## Database Migrations

Run migrations in order:

1. `001_initial_schema.sql` - Core tables (interviews, messages, evaluations)
2. `002_add_meta_prompt_to_interviews.sql` - Meta prompt field
3. `003_create_question_banks.sql` - Question bank system
4. `004_add_question_bank_to_interviews.sql` - Link interviews to question banks
5. `005_add_hiring_decision_to_evaluations.sql` - Hiring decision field
6. `006_add_resume_and_job_description.sql` - Resume/JD storage
7. `007_create_user_profiles.sql` - User profiles table
8. `008_add_subscriptions.sql` - Subscription tracking
9. `009_add_name_to_user_profiles.sql` - User name field

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Netlify deployment instructions.

## License

MIT

