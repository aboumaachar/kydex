import './globals.css';
import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import AuthShell from '../components/auth-shell';
import PublicHeader from '../components/public-header';
import PublicFooter from '../components/public-footer';
import { LanguageProvider } from '../i18n/i18n-provider';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'KYDEX',
  description: 'KYDEX compliance intelligence for governed screening, case review, audit evidence, and regulated workflow operations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-arabic antialiased bg-background`}>
        <LanguageProvider>
          <PublicHeader />
          <AuthShell>{children}</AuthShell>
          <PublicFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
