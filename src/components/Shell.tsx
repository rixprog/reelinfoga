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
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-[60px] w-full max-w-[1400px] items-center gap-8 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">ReelBrain</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {NAV.map((n) => {
              const active = n.match(path);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex w-[62px] flex-col items-center gap-1 rounded-xl py-1.5
                              transition ${
                                active
                                  ? 'bg-primary-soft'
                                  : 'hover:bg-background'
                              }`}
                >
                  <TabIcon name={n.label} active={active} />
                  <span
                    className={`text-[11px] leading-none ${
                      active ? 'font-semibold text-primary' : 'text-ink-muted'
                    }`}
                  >
                    {n.label}
                  </span>
                </Link>
              );
            })}
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
      className={`mx-auto w-full px-5 pb-24 sm:pb-12 ${
        wide ? 'max-w-[1400px]' : 'max-w-5xl'
      } ${bare ? '' : 'py-8 sm:py-10'}`}
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
