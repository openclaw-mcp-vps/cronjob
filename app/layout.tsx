import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cronjob.run"),
  title: "cronjob | Reliable scheduled tasks in the cloud",
  description:
    "Run recurring jobs with confidence. Cronjob gives you cloud scheduling, execution logs, and failure alerts without managing servers.",
  keywords: [
    "cron jobs",
    "job scheduler",
    "cloud cron",
    "task automation",
    "failure notifications"
  ],
  openGraph: {
    title: "cronjob | Reliable scheduled tasks in the cloud",
    description:
      "Set up recurring jobs via dashboard or API, monitor execution logs in real time, and get notified before failed tasks hurt your product.",
    url: "https://cronjob.run",
    siteName: "cronjob",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "cronjob | Reliable scheduled tasks in the cloud",
    description:
      "A dependable cron job service for solo developers and small SaaS teams."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${monoFont.variable}`}>
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
