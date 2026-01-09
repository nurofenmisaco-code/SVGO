// app/page.tsx - Home/Landing page

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">SVGO.to</h1>
          <div className="flex items-center gap-4">
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href="/links">
                  <Button variant="ghost">My Links</Button>
                </Link>
                <Link href="/create">
                  <Button>Create Link</Button>
                </Link>
                <UserButton />
              </div>
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in">
                <Button>Sign In</Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-5xl font-bold tracking-tight">
            Short Links That Open
            <br />
            <span className="text-primary">Native Shopping Apps</span>
          </h2>
          
          <p className="text-xl text-muted-foreground">
            Convert your affiliate links into short links that automatically open
            native shopping apps on mobile devices. Boost your conversion rates
            with seamless app deep linking.
          </p>

          <SignedIn>
            <Link href="/create">
              <Button size="lg" className="text-lg px-8">
                Create Your First Link
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedIn>

          <SignedOut>
            <Link href="/sign-in">
              <Button size="lg" className="text-lg px-8">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedOut>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Smart Redirects</h3>
              <p className="text-muted-foreground">
                Automatically detects mobile devices and opens native apps when available.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Click Tracking</h3>
              <p className="text-muted-foreground">
                Track daily clicks per link with detailed analytics and insights.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Link History</h3>
              <p className="text-muted-foreground">
                Store and search your link history for easy retrieval and management.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



