import type React from "react"
import "@/app/globals.css"
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import localFont from "next/font/local";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getBrandName } from "@/utils/appMode";
 import QueryWrapper from "@/components/pawtrack/layout/queryWrapper";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/provider/AuthProvider";
import PWAInstallPrompt from "@/components/pawtrack/pwa-install-prompt";
import { TooltipProvider } from "@/components/ui/tooltip";
import VideoCallListener from "@/components/pawtrack/video-call/VideoCallListener";
import { NotificationInitializer } from "@/components/pawtrack/notification-bell/NotificationInitializer";
import { NotificationListener } from "@/components/pawtrack/notification-bell/NotificationListener";


const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// MediTrack Administration Register's typography (Archivo + IBM Plex Mono,
// per the Arogya HMS design spec). Exposed as CSS variables globally but
// only ever applied within the admin-register scope — PawTrack and the
// rest of MediTrack keep using Geist.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
});


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers();
  const brandName = getBrandName(headersList.get("x-subdomain"));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={brandName} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content={brandName} />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </head>
      <body className={`antialiased ${archivo.variable} ${plexMono.variable}`} suppressHydrationWarning>
        <AuthProvider>
          <NuqsAdapter>
            <QueryWrapper>
              <TooltipProvider delayDuration={100}>
                {children}
                <NotificationInitializer />
                <NotificationListener />
                <VideoCallListener />
              </TooltipProvider>
              <Toaster />
              {/* <PWAInstallPrompt /> */}
            </QueryWrapper>
          </NuqsAdapter>
        </AuthProvider>
      </body>
    </html>
  )
}

export async function generateMetadata() {
  const headersList = await headers();
  const brandName = getBrandName(headersList.get("x-subdomain"));

  return {
    title: `${brandName} - Clinic Management System`,
    description: "Clinic Management System",
    icons: {
      icon: "/images/logo.png",
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: brandName,
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};
