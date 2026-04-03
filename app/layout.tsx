import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NHL Stats Dashboard",
  description:
    "Interactive visualizations of every NHL goal since 2010. Goal maps, career arcs, and head-to-head matchups.",
  openGraph: {
    title: "NHL Stats Dashboard",
    description: "Interactive visualizations of every NHL goal since 2010.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", inter.variable, "font-sans", geist.variable)}>
      <body className="h-full">{children}</body>
    </html>
  );
}
