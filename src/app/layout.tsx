import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Literata } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// The document tier: job descriptions, coaching briefs, interview questions —
// anything the app presents as a piece of writing rather than as interface.
const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://job-tracker-app-project.vercel.app"),
  title: {
    default: "Margin — the AI reads the posting with you",
    template: "%s · Margin",
  },
  description:
    "Margin marks up a job posting against your resume: what you already have, what you're missing, and how to answer for it.",
  openGraph: {
    title: "Margin — the AI reads the posting with you",
    description:
      "Paste a job posting and watch it get marked up against your resume — matched skills highlighted, gaps underlined, interview questions drilled.",
    url: "/",
    siteName: "Margin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Margin — the AI reads the posting with you",
    description:
      "Paste a job posting and watch it get marked up against your resume — matched skills highlighted, gaps underlined, interview questions drilled.",
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
      className={`${GeistSans.variable} ${GeistMono.variable} ${literata.variable} h-full scroll-smooth antialiased`}
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
