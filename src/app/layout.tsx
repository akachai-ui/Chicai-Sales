import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chicai-Sales - Sales Management & Factory Map",
  description: "Industrial factory map and sales management platform for sales teams",
  applicationName: "Chicai Sales",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chicai Sales",
  },
  formatDetection: {
    telephone: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1b9b8e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased font-sans select-none sm:select-auto pb-16 sm:pb-0">
        {children}
      </body>
    </html>
  );
}
