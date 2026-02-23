import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fiscio/api', '@fiscio/db', '@fiscio/ui'],
  // @react-pdf/renderer mag niet door de Next.js webpack bundler — server-side houden
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig
