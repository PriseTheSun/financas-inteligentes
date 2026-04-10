import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Finanças Inteligentes | IA',
  description: 'Controle suas finanças com inteligência artificial.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning className="bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
