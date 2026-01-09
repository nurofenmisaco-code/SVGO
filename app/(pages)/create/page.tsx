// app/(pages)/create/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CreateLinkForm } from '@/components/svgo/create-link-form';

export default async function CreatePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold">Create Short Link</h1>
              <p className="text-muted-foreground mt-2">
                Paste your affiliate URL to create a short link that opens native shopping apps on mobile.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <CreateLinkForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



