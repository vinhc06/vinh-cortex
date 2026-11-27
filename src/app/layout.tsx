import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import TacticalEffects from "@/components/TacticalEffects";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vinh Cortex",
  description: "Software engineering, creative work, and personal telemetry.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <TacticalEffects>{children}</TacticalEffects>
      </body>
    </html>
  );
}
