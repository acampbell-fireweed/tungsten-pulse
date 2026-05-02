export default function Home() {
  return (
    <main className="relative bg-[#0c0d10] text-[#ebe6dc] min-h-screen flex flex-col items-center justify-center">
      <h1 className="font-serif text-6xl font-light tracking-tight">Tungsten Pulse</h1>
      <p className="font-mono text-xs tracking-widest opacity-60 mt-4">
        FIREWEED METALS · INTERNAL INTELLIGENCE · v0.1
      </p>
      <p className="text-sm opacity-50 mt-8 font-mono">
        Phase 1 · Session 1 complete · Foundation deployed
      </p>
      <footer className="absolute bottom-8 text-xs opacity-30 font-mono">
        Built with Next.js, Vercel, Supabase, Claude API
      </footer>
    </main>
  );
}
