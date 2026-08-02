'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Analyze', match: (p: string) => p === '/' },
  { href: '/reels', label: 'Reels', match: (p: string) => p.startsWith('/reels') || p.startsWith('/reel/') },
  { href: '/map', label: 'Map', match: (p: string) => p.startsWith('/map') },
  { href: '/saved', label: 'Saved', match: (p: string) => p.startsWith('/saved') },
  { href: '/history', label: 'History', match: (p: string) => p.startsWith('/history') },
];


export function Logo() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-primary">
      <span className="block size-2.5 rounded-[3px] bg-white/95" />
    </span>
  );
}

/**
 * Top bar on desktop, bottom tab bar on phones.
 *
 * The active marker is a 2px underline, not a filled pill — a pill on a text nav
 * is the single most generic element in web UI and reads as a template.
 */
export function Header() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-purple-100/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-zinc-900">ReelInfoga</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => {
              const active = n.match(path);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-violet-100/90 text-violet-700 shadow-sm'
                      : 'text-zinc-600 hover:bg-violet-50 hover:text-zinc-900'
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <Link
              href="/settings"
              aria-label="Settings"
              className={`ml-2 grid size-8 place-items-center rounded-full transition ${
                path.startsWith('/settings')
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-zinc-500 hover:bg-violet-50 hover:text-zinc-900'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor"
                   strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.1" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 9v0a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1Z" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface sm:hidden">
        {NAV.map((n) => {
          const active = n.match(path);
          return (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-col items-center gap-1 py-2.5"
            >
              <TabIcon name={n.label} active={active} />
              <span
                className={`text-[10px] ${active ? 'font-semibold text-primary' : 'text-ink-faint'}`}
              >
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Line icons built from primitives — emoji-as-icons is the clearest tell of a generated app. */
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const s = active ? 'var(--primary)' : 'var(--ink-faint)';
  const common = { fill: 'none', stroke: s, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      {name === 'Analyze' && (
        <>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" {...common} />
          <circle cx="12" cy="12" r="4.2" {...common} />
        </>
      )}
      {name === 'Reels' && (
        <>
          <rect x="3.2" y="3.2" width="7" height="17.6" rx="2" {...common} />
          <rect x="13.8" y="3.2" width="7" height="10" rx="2" {...common} />
          <rect x="13.8" y="15.6" width="7" height="5.2" rx="2" {...common} />
        </>
      )}
      {name === 'Map' && (
        <>
          <path d="M12 21s6.5-6.1 6.5-10.5A6.5 6.5 0 0 0 5.5 10.5C5.5 14.9 12 21 12 21Z" {...common} />
          <circle cx="12" cy="10.4" r="2.3" {...common} />
        </>
      )}
      {name === 'Saved' && (
        <path d="M6.5 3.6h11a1 1 0 0 1 1 1v15.2l-6.5-4-6.5 4V4.6a1 1 0 0 1 1-1Z" {...common} />
      )}
      {name === 'History' && (
        <>
          <circle cx="12" cy="12" r="8.4" {...common} />
          <path d="M12 7.2V12l3.2 2" {...common} />
        </>
      )}
    </svg>
  );
}

export function Page({
  title,
  subtitle,
  action,
  children,
  wide = false,
  bare = false,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  bare?: boolean;
}) {
  return (
    <main
      className={`mx-auto w-full pb-24 sm:pb-12 ${
        wide ? 'max-w-7xl px-4 sm:px-6 lg:px-8' : 'max-w-5xl px-5'
      } ${bare ? 'py-4 sm:py-6' : 'py-8 sm:py-10'}`}
    >
      {title && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em] sm:text-[32px]">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-[15px] text-ink-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={title ? 'mt-7' : ''}>{children}</div>
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
      {edge && <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: edge }} />}
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
  tone?: 'ok' | 'warn' | 'bad' | 'violet' | 'flat';
}) {
  const map = {
    ok: 'bg-[#DCFCE7] text-[#15803D]',
    warn: 'bg-[#FEF3C7] text-[#B45309]',
    bad: 'bg-[#FEE2E2] text-[#B91C1C]',
    violet: 'bg-primary-soft text-primary',
    flat: 'bg-background text-ink-muted',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md px-6 text-sm leading-relaxed text-ink-muted">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
