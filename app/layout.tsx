import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-display"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cronjob.run"),
  title: "cronjob | Reliable Cloud Cron Jobs",
  description:
    "Run scheduled jobs in the cloud with webhook retries, failure alerts, and execution logs. Stop debugging silent cron failures.",
  openGraph: {
    title: "cronjob | Reliable Cloud Cron Jobs",
    description:
      "Set recurring jobs with a simple API, monitor every run, and get notified instantly when a task fails.",
    url: "https://cronjob.run",
    siteName: "cronjob",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "cronjob",
    description: "Cloud cron jobs with logs, retries, and failure alerts for SaaS teams."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${displayFont.variable} ${monoFont.variable} font-[var(--font-display)] text-[#e6edf3]`}>{children}</body>
    </html>
  );
}
