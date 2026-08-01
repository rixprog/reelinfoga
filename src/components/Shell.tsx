'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Library' },
  { href: '/trips', label: 'Trips' },
  { href: '/alerts', label: 'Alerts' },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-8 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-[9px] bg-primary">
            <span className="block size-2.5 rounded-[3px] bg-white/95" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">ReelBrain</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            // "/" would match every route under startsWith, so it needs exact.
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  active
                    ? 'bg-primary-soft font-medium text-primary'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function Page({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-ink-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Card({
  children,
  className = '',
  edge,
}: {
  children: React.ReactNode;
  className?: string;
  edge?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface ${className}`}
    >
      {edge && (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: edge }}
        />
      )}
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Pill({
  children,
  tone = 'flat',
}: {
  children: React.ReactNode;
  tone?: keyof typeof import('@/lib/ui').TONE;
}) {
  const map: Record<string, string> = {
    ok: 'bg-[#DCFCE7] text-[#16A34A]',
    warn: 'bg-[#FEF3C7] text-[#D97706]',
    bad: 'bg-[#FEE2E2] text-[#DC2626]',
    violet: 'bg-primary-soft text-primary',
    flat: 'bg-background text-ink-faint',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
        {body}
      </p>
    </div>
  );
}
