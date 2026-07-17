import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
