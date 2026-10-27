import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import "@/components/beui/theme.css"
import "@/components/bklit/theme.css"
import "./review.css"
import { Providers } from "@/components/providers"

// Keep one variable font and optical-size axis across the list and drawer.
const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Flowline · Workflow frequency review",
  description:
    "Understand workflow schedules and migration scope. Your data stays in your browser.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} font-sans antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
