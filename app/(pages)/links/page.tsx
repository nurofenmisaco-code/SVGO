// app/(pages)/links/page.tsx

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { LinkList } from '@/components/svgo/link-list';
import { Button } from '@/components/ui/button';
import { getOrCreateUser } from '@/lib/utils/user';

export default async function LinksPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Get Clerk user for email
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;

  // Get or create user from shared database
  const user = await getOrCreateUser(userId, email);

  if (!user) {
    // Show error message instead of redirecting
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">User Setup Required</h1>
          <p className="text-muted-foreground">
            Please ensure you are signed up in the main SV project first, or contact support.
          </p>
        </div>
      </div>
    );
  }

  // Fetch user's links
  const links = await prisma.svgoLink.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: {
          dailyClicks: true,
        },
      },
    },
  });

  // Convert dates to strings for serialization
  const serializedLinks = links.map((link) => ({
    ...link,
    createdAt: link.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">My Links</h1>
                <p className="text-muted-foreground mt-2">
                  Manage and track your short links
                </p>
              </div>
              <Link href="/create">
                <Button>Create New</Button>
              </Link>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <LinkList initialLinks={serializedLinks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

