import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export function PageShell({
  children,
  eyebrow,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,_#09090b_0%,_#020617_100%)] text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 border-b border-zinc-800 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-3 text-sm text-zinc-300 hover:text-zinc-50">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">FlowPvP Brackets</span>
            </Link>
            {eyebrow ? <Badge>{eyebrow}</Badge> : null}
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">{description}</p>
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
