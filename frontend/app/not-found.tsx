export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-lg mb-6">Page not found.</p>
      <a
        href="/clients"
        className="px-4 py-2 bg-foreground text-background rounded-md"
      >
        Go Home
      </a>
    </div>
  );
}
