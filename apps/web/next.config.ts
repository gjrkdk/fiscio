import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fiscio/api', '@fiscio/db', '@fiscio/ui'],
}

export default nextConfig
