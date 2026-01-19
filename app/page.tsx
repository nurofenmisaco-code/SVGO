// app/page.tsx - Backend-only service, no UI needed
// This page is only for the root route, redirect handler is at /[code]

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">SVGO Backend API</h1>
        <p className="text-muted-foreground">
          This is a backend-only service. Use the API endpoints to create and manage short links.
        </p>
      </div>
    </div>
  );
}
