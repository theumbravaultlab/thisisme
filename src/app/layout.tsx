import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Quicksand,
  Caveat,
  Archivo_Black,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Selectable display fonts for the profile name.
const playfair = Playfair_Display({ variable: "--font-serif", subsets: ["latin"] });
const quicksand = Quicksand({ variable: "--font-rounded", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-script", subsets: ["latin"] });
const archivo = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "thisisme",
  description: "Customize a profile that shows the real you, your way.",
  openGraph: {
    title: "thisisme",
    description: "A profile that shows the real you, your way.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${quicksand.variable} ${caveat.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
