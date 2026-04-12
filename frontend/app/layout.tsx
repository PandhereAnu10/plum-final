import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppToaster } from "@/components/AppToaster";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Plum OPD Claim Adjudication",
  description: "Submit and review OPD reimbursement claims.",
};

export const viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#fff5f7] font-sans antialiased text-zinc-900 dark:bg-[#050505] dark:text-zinc-100`}
      >
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <AppToaster />
            <Navbar />
            <main className="relative z-0 mx-auto w-full max-w-6xl flex-1 bg-[#fff5f7] px-4 py-10 dark:bg-[#050505] sm:px-6 sm:py-12">
              {children}
            </main>
            <footer className="relative z-0 border-t border-zinc-200/80 bg-[#fff5f7] py-5 text-center text-xs tracking-wide text-zinc-600 dark:border-white/10 dark:bg-[#050505] dark:text-zinc-500">
              Plum OPD — AI command center
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
