import type { Metadata } from "next";
import {
  Libre_Baskerville,
  Lora,
  IBM_Plex_Mono,
} from "next/font/google";

import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Chronicle",
  description: "Share your stories with the world",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${libreBaskerville.variable} ${lora.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
