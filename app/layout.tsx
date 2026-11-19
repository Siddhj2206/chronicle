import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { feedAlternates, siteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Chronicle",
  description: "Share your stories with the world",
  alternates: { types: feedAlternates() },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="theme-color"
          content="#f6f7f9"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#111315"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
