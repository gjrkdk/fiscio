import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fiscio — AI-native administratie voor ZZP\'ers',
  description: 'Ritregistratie, bonnetjes, facturen en belastingadvies in één app. Fiscio denkt voor je.',
  openGraph: {
    title: 'Fiscio — AI-native administratie voor ZZP\'ers',
    description: 'Ritregistratie, bonnetjes, facturen en belastingadvies in één app.',
    url: 'https://fiscio.vercel.app',
    siteName: 'Fiscio',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
