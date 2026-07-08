import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://job-tracker-app-project.vercel.app"),
  title: {
    default: "Job Tracker — AI-powered job application tracking",
    template: "%s · Job Tracker",
  },
  description:
    "Smart job application tracker with AI-powered JD analysis, resume fit scoring, and resume tailoring.",
  openGraph: {
    title: "Job Tracker — AI-powered job application tracking",
    description:
      "Track your pipeline, analyze job descriptions with AI, and tailor your resume to every application.",
    url: "/",
    siteName: "Job Tracker",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Job Tracker — AI-powered job application tracking",
    description:
      "Track your pipeline, analyze job descriptions with AI, and tailor your resume to every application.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
