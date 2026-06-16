import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
import DeferredCustomCursor from "@/components/deferred-custom-cursor";
import { SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.variable} ${syne.variable} ${jetbrains.variable} relative bg-background text-foreground antialiased`}>
        <DeferredCustomCursor />
        {children}
      </body>
    </html>
  );
}
