# Interview Prep Tool

A voice-based interview preparation tool that allows you to practice interviews with AI-powered interviewers. The tool can emulate specific hiring managers based on their LinkedIn profiles and provides detailed analytics on your performance.

## Features

- 🎤 Voice-based interview conversations using OpenAI TTS/STT
- 👔 LinkedIn profile integration to emulate real interviewers
- 📊 Performance analytics and evaluation
- 📱 Mobile-friendly design
- 🔐 Secure authentication with Supabase
- 💾 Conversation history and tracking

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Voice**: OpenAI TTS/STT APIs
- **LLM**: OpenAI GPT-4
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key

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
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXT_PUBLIC_APP_URL`: Your app URL (http://localhost:3000 for local)

4. Set up Supabase database:
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
interview_prepper/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── interview/        # Interview interface components
│   ├── setup/            # Interview setup components
│   ├── analytics/        # Analytics components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client utilities
│   ├── openai/           # OpenAI utilities
│   └── evaluation/       # Evaluation logic
├── types/                 # TypeScript type definitions
└── supabase/             # Database migrations
```

## License

MIT
