import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import BackgroundIcons from "@/components/shared/BackgroundIcons"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Debug Vitals — Diagnose the cause, not just the symptom.",
  description:
    "Developer diagnostic tool for AI-assisted coding. Connects agent actions → code changes → environment → tests → CI failures.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ position: "relative", minHeight: "100dvh" }}>
        <BackgroundIcons />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
