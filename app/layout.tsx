import type { Metadata } from "next";
import { Archivo, Figtree, Barlow_Condensed } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const mark = Barlow_Condensed({
  variable: "--font-mark",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vexo · Proof of pass",
  description:
    "A living pass on your device. Only real humans. We do not store your data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${mark.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
