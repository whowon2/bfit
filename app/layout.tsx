import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Sidebar from "@/components/sidebar";

const REPO_URL = "https://github.com/whowon2/bfit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BFit",
  description:
    "Track your progress, stay motivated, and reach your fitness goals with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex w-full flex-col bg-background font-sans md:flex-row`}
        suppressHydrationWarning
      >
        <Sidebar />
        <div className="flex min-h-screen w-full flex-col items-center justify-between">
          {children}
          <footer className="container flex w-full items-center justify-center gap-1 p-4 text-muted-foreground text-sm">
            Made by Whowon ·{" "}
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GitHub
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
