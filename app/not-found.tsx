import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">
        {"// 404"}
      </p>

      <h1 className="font-display text-[clamp(64px,12vw,120px)] font-extrabold leading-none tracking-[-0.05em] text-foreground">
        Not found
      </h1>

      <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-copy-muted">
        Questa pagina non esiste. Forse era qui una volta, o forse non ci è mai stata.
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] text-copy-muted transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        ← torna all&apos;home
      </Link>
    </main>
  );
}
