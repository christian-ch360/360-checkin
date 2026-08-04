export function HomeGreeting({ firstName }: { firstName: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1 text-base text-muted-foreground">Here&apos;s what you need to do today.</p>
    </div>
  );
}
