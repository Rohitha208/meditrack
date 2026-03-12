import type React from "react"
import "@/app/globals.css"
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import localFont from "next/font/local";
import QueryWrapper from "@/components/layout/queryWrapper";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/provider/AuthProvider";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationInitializer } from "@/components/notification-bell/NotificationInitializer";
import { NotificationListener } from "@/components/notification-bell/NotificationListener";
import VideoCallListener from "@/components/video-call/VideoCallListener";

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


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PawTrack" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="PawTrack" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </head>
      <body className={`antialiased`} suppressHydrationWarning>
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

export const metadata = {
  title: "PawTrack - Clinic Management System",
  description: "Clinic Management System",
  icons: {
    icon: "/images/logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PawTrack",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};
