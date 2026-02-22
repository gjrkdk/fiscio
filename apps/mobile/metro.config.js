const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Laat Metro weten waar de monorepo root is
config.watchFolders = [monorepoRoot]

// Resolve packages: eerst lokaal, dan monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Zorg dat react-native altijd uit de mobile app komt (één versie)
config.resolver.disableHierarchicalLookup = true

module.exports = config
