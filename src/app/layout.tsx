import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import { StoreHydrator } from "@/components/store-hydrator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal Prep Planner",
  description: "Optimize your meal prep and shopping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreHydrator />
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
