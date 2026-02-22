import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fiscio — AI-native administratie voor ZZP\'ers',
  description: 'Ritregistratie, bonnetjes, facturen en belastingadvies in één app.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
