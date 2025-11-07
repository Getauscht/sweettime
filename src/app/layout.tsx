import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/session-provider";
import { prisma } from '@/lib/prisma'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.settings.findFirst()

    return {
      title: settings?.siteName || 'SweetTime - Autenticação',
      description: 'Sistema de autenticação com Next.js, NextAuth e MySQL',
      icons: settings?.faviconUrl
        ? { icon: settings.faviconUrl, shortcut: settings.faviconUrl, apple: settings.faviconUrl }
        : undefined,
    }
  } catch (err) {
    console.error('Error loading settings for metadata', err)
    return {
      title: 'SweetTime - Autenticação',
      description: 'Sistema de autenticação com Next.js, NextAuth e MySQL',
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning helps mute harmless hydration mismatch warnings
    // caused by browser extensions (ex: Dark Reader) injecting attributes.
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
