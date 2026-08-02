import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ProximityWatch } from '@/components/ProximityWatch';
import { Header } from '@/components/Shell';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ReelInfoga',
  description: 'Turn saved reels into searchable knowledge.',
};

// Explicit so the layout behaves on a real phone rather than being zoomed out.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAFA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <Header />
        <div className="flex-1">{children}</div>
        {/* Watches the relay on every page, so walking past a saved food spot
            alerts you wherever you are in the app — not only on /map. */}
        <ProximityWatch />
      </body>
    </html>
  );
}
