import { GetServerSideProps } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import CreditsDisplay from '@/components/CreditsDisplay';
import Head from 'next/head';
import { Database } from '@/lib/database.types';
import { parse } from 'cookie';

export default function CreditsPage() {
  return (
    <>
      <Head>
        <title>Your Credits - Instagen</title>
        <meta name="description" content="Manage your monthly credits" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Credits Dashboard</h1>
          <p className="text-gray-700 mb-8">
            Monitor and manage your monthly usage quota. You receive 100 credits at the beginning
            of each month which can be used for various actions on the platform.
          </p>
          
          <CreditsDisplay showUsageLogs={true} />
          
          <div className="mt-10 p-6 bg-white rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold mb-4">How Credits Work</h2>
            <div className="space-y-4">
              <p>
                Your account is allocated <strong>100 credits</strong> at the beginning of each month.
                These credits allow you to perform various actions on our platform:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Generate Image</strong> - 1 credit per standard image</li>
                <li><strong>Process File</strong> - 2 credits per file</li>
                <li><strong>Send Notification</strong> - 1 credit per 10 notifications</li>
              </ul>
              
              <p>
                Credits reset automatically on the 1st day of each month. Unused credits do not
                roll over to the next month.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Need More Credits?</h3>
                <p className="text-blue-700">
                  If you require additional credits, consider upgrading to our Pro plan for 500 credits
                  per month, or Enterprise for unlimited usage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Create Supabase client using cookie from request
  const cookieHeader = context.req.headers.cookie || '';
  const cookies = parse(cookieHeader);
  const supabaseAuthToken = cookies['sb-auth-token'];
  
  // Create a standard Supabase client
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
  
  // Try to set the session from the cookie if it exists
  if (supabaseAuthToken) {
    try {
      const token = JSON.parse(supabaseAuthToken);
      if (token?.access_token) {
        await supabase.auth.setSession({
          access_token: token.access_token,
          refresh_token: token.refresh_token || '',
        });
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      // No props needed as we'll fetch data client-side
    },
  };
}; 