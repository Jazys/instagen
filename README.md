# Instagen - AI Influencer Platform

A modern web application for managing AI-powered influencer content, built with Next.js, TypeScript, and Supabase.

## Features

- **Secure Authentication**: Email/password login and registration powered by Supabase Auth
- **Protected Routes**: Middleware to ensure only authenticated users can access certain routes
- **User Profiles**: Automatic profile creation on sign-up with Supabase triggers
- **Modern UI**: Beautiful, responsive interface built with modern components
- **Session Management**: Robust session handling to prevent authentication issues

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **Deployment**: Ready for Vercel, Netlify, or any static hosting

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- A Supabase account (free tier works perfectly)

### Setup Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/instagen.git
cd instagen
```

2. **Install dependencies**

```bash
npm install
```

3. **Create a Supabase project**

- Go to [Supabase](https://supabase.com) and create a new project
- Note your project URL and anon key from the project settings

4. **Set up environment variables**

Copy the `.env.local.example` file to `.env.local` and update with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. **Run the database migrations**

The SQL migration files in the `supabase/migrations` directory are set up to create:
- A `profiles` table to store user profile information
- Row-level security policies to protect your data
- Database triggers to automatically create profiles when users sign up

You can run these migrations manually in the Supabase SQL editor or use the Supabase CLI.

6. **Enable email auth in Supabase**

- In your Supabase dashboard, go to Authentication > Providers
- Ensure that Email provider is enabled and "Allow new users to sign up" is turned ON

7. **Start the development server**

```bash
npm run dev
```

8. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) to see the application running.

## Project Structure

```
/
├── public/             # Static assets
├── src/
│   ├── components/     # React components
│   ├── lib/            # Utilities and library setups
│   │   ├── auth.ts     # Authentication helpers
│   │   ├── supabase.ts # Supabase client setup
│   │   └── database.types.ts # TypeScript types for DB
│   ├── pages/          # Next.js pages
│   │   ├── auth/       # Authentication pages (login, register)
│   │   └── dashboard/  # Protected dashboard pages
│   └── middleware.ts   # Authentication middleware
├── supabase/
│   └── migrations/     # SQL migration files for Supabase
└── .env.local          # Environment variables (create from .env.local.example)
```

## Authentication Flow

1. Users register with email/password at `/auth/register`
2. On successful registration, a profile is automatically created in the `profiles` table
3. Users can log in at `/auth/login`
4. Protected routes (like `/dashboard`) require authentication
5. The middleware redirects unauthenticated users to login

## Troubleshooting

### Session Issues
If you experience issues with authentication or sessions:
- Ensure your environment variables are correctly set
- Check browser console logs for session-related errors
- Verify that your Supabase auth settings allow signups
- Try clearing browser localStorage and cookies

### Database Issues
- Check your SQL migration has run correctly
- Verify the trigger function for profile creation is working
- Test queries directly in the Supabase dashboard

## Deployment

1. **Vercel Deployment**
The easiest way to deploy is through Vercel:

```bash
npm i -g vercel
vercel
```

2. **Other Platforms**
Build the project and deploy the static files:

```bash
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Next.js team for the amazing framework
- Supabase for the open source Firebase alternative
- All open source contributors