import type { Metadata } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const body = Pixelify_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mark = Press_Start_2P({
  variable: "--font-mark",
  subsets: ["latin"],
  weight: "400",
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
      className={`${body.variable} ${mark.variable} h-full`}
    >
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
