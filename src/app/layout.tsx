import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/session-provider";
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

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
    const siteName = settings?.siteName?.trim() || 'SweetTime'

    // Use Metadata title object to provide a default and a template so
    // individual pages can set their own titles which will be formatted
    // as "<Page Title> - <Site Name>" automatically.
    return {
      title: {
        // Format titles as: "<Site Name> - <Page Title>" per request
        default: siteName,
        template: `${siteName} - %s`,
      },
      description: 'Reino Doce',
      icons: settings?.faviconUrl
        ? { icon: settings.faviconUrl, shortcut: settings.faviconUrl, apple: settings.faviconUrl }
        : undefined,
    }
  } catch (err) {
    console.error('Error loading settings for metadata', err)
    return {
      title: {
        // Fallback: format as "<Site Name> - <Page Title>"
        default: 'SweetTime',
        template: `SweetTime - %s`,
      },
      description: 'Reino Doce',
    }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build initial settings to inject on the window object.
  const initialSettings: { siteName?: string | null; logoDataUrl?: string | null; logoUrl?: string | null } = {
    siteName: null,
    logoDataUrl: null,
    logoUrl: null,
  };

  function mimeFromExt(ext: string) {
    switch (ext.toLowerCase()) {
      case '.svg': return 'image/svg+xml';
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.webp': return 'image/webp';
      case '.gif': return 'image/gif';
      default: return 'application/octet-stream';
    }
  }

  try {
    const settings = await prisma.settings.findFirst()
    initialSettings.siteName = settings?.siteName || null
    const logoUrl = settings?.logoUrl?.trim() || null

    if (logoUrl) {
      // If it's an absolute/external URL, keep as URL only (can't inline easily).
      if (/^(https?:)?\/\//i.test(logoUrl)) {
        initialSettings.logoUrl = logoUrl
      } else {
        // Treat as local path. Normalize possible "public/..." or "/uploads/..." values.
        const rel = logoUrl.replace(/^public\//, '').replace(/^\//, '')
        const absPath = path.join(process.cwd(), 'public', rel)
        try {
          if (fs.existsSync(absPath)) {
            const buffer = await fs.promises.readFile(absPath)
            const ext = path.extname(rel) || ''
            const mime = mimeFromExt(ext)
            const base64 = buffer.toString('base64')
            initialSettings.logoDataUrl = `data:${mime};base64,${base64}`
          } else {
            // file not found in public; fallback: pass original string as logoUrl
            initialSettings.logoUrl = logoUrl
          }
        } catch (err) {
          console.error('Error reading logo file for inlining', err)
          initialSettings.logoUrl = logoUrl
        }
      }
    }
  } catch (err) {
    // ignore: initialSettings stays mostly null
    console.error('Error building initial settings for layout', err)
  }

  const script = `window.__APP_SETTINGS = ${JSON.stringify(initialSettings)};`

  return (
    // suppressHydrationWarning helps mute harmless hydration mismatch warnings
    // caused by browser extensions (ex: Dark Reader) injecting attributes.
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {/* Inject initial settings so client components (Header) can read them without a fetch */}
          <script dangerouslySetInnerHTML={{ __html: script }} />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
