import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jbMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentDoctor — Diagnose the cause, not just the symptom",
  description:
    "AgentDoctor connects agent actions, code changes, environment state, and CI failures into a causal chain — so you understand what actually broke and why.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <body style={{ background: "#F9FBFB", color: "#1C2222", minHeight: "100dvh" }}>
        {children}
      </body>
    </html>
  );
}
